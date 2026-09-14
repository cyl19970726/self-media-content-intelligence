"""One-time latest-format cleanup. Plan first; apply only the saved hash-bound plan.
Raw media/capture evidence and independent publication data are deliberately excluded.
"""
import argparse
import hashlib
import json
import pathlib
import shutil
import sqlite3

LATEST = '00000000-0000-4000-8000-000000000908'
PENDING = '1daadd8d-5921-475b-8b44-0232cede33d1'
LENSES = {'contentRestoration', 'directingLogic', 'visualEditing'}
REPORT_NAMES = {'reconstruction.json', 'article.md', 'report.md', 'evaluation.json', 'evaluation.md',
 'gate-report.json', 'builder-validation.json', 'builder-report-render.json', 'candidate-last-message.txt',
 'runtime-three-lens-evaluation.json', 'runtime-three-lens-gate-report.json', 'creator-analysis.json',
 'creator-analysis.md', 'creator-report.md', 'report-overview.json'}
REPORT_PREFIXES = ('video-reconstruction-batch-', 'creator-analysis.', 'creator-synthesis-gate.',
 'creator-comparison.', 'comparison-analysis.', 'report-overview.')

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def latest(p):
 try:
  d = json.loads(p.read_text()); return LENSES <= set(d.get('builderLenses', {}))
 except (ValueError, OSError, TypeError): return False

def plan(project, runtime):
 db = runtime / 'self-media.sqlite'
 with sqlite3.connect(f'file:{db}?mode=ro', uri=True) as c:
  runs = [json.loads(row[0]) for row in c.execute('select run_json from creator_research_runs')]
  old = [r['id'] for r in runs if r['id'] not in {LATEST, PENDING}]
  standalone = [r[0] for r in c.execute('select id from runs')]
 targets = []
 for run_id in old + standalone:
  root = runtime / 'runs' / run_id
  if not root.exists(): continue
  for p in root.rglob('*'):
   if not p.is_file(): continue
   if p.name not in REPORT_NAMES and not p.name.startswith(REPORT_PREFIXES): continue
   if latest(p): raise RuntimeError(f'Unexpected latest report in deletion run: {p}')
   targets.append({'path': str(p), 'sha256': digest(p), 'bytes': p.stat().st_size})
 source = project / '.runtime/runs' / LATEST
 if not latest(source / 'video-reconstructions/6a8ae3190000000028022b9f/reconstruction.json'):
  raise RuntimeError('Latest source report missing')
 return {'schemaVersion':'latest-cleanup-plan@1', 'runtime':str(runtime), 'project':str(project),
  'deleteCreatorRunIds':old, 'deleteStandaloneRunIds':standalone, 'deleteFiles':targets,
  'importRunId':LATEST, 'preservePendingRunId':PENDING,
  'scope':'old registered analysis results and dependent batch/comparison records; raw evidence preserved'}

def apply(p):
 root = pathlib.Path(p['runtime']); project = pathlib.Path(p['project'])
 # Validate everything before the first mutation.
 for f in p['deleteFiles']:
  path = pathlib.Path(f['path'])
  if not path.is_relative_to(root / 'runs') or digest(path) != f['sha256']:
   raise RuntimeError(f'Cleanup target changed: {path}')
 source_db = project / '.runtime/self-media.sqlite'
 with sqlite3.connect(source_db.as_uri() + '?mode=ro', uri=True) as source:
  row = source.execute('select * from creator_research_runs where id=?', (LATEST,)).fetchone()
 if not row: raise RuntimeError('Latest run registration missing')
 db = root / 'self-media.sqlite'
 with sqlite3.connect(db) as c:
  active = c.execute("select count(*) from research_jobs where status in ('running','leased')").fetchone()[0]
  if active: raise RuntimeError('Research workers still running; stop before cleanup')
  old = p['deleteCreatorRunIds']
  existing = {r[0] for r in c.execute('select id from creator_research_runs')}
  if not set(old) <= existing: raise RuntimeError('Run inventory changed; regenerate plan')
  src = project / '.runtime/runs' / LATEST; dest = root / 'runs' / LATEST
  if dest.exists():
   source_files = {f.relative_to(src): digest(f) for f in src.rglob('*') if f.is_file()}
   target_files = {f.relative_to(dest): digest(f) for f in dest.rglob('*') if f.is_file()}
   if source_files != target_files: raise RuntimeError('Latest target differs; do not overwrite')
  else:
   shutil.copytree(src, dest)
  try:
   c.execute('BEGIN IMMEDIATE')
   c.execute('insert into creator_research_runs values (?,?,?,?,?,?,?,?)', row)
   for rid in old:
    for table in ['research_jobs','research_events','creator_research_batch_items']:
     c.execute(f'delete from {table} where run_id=?',(rid,))
    c.execute('delete from creator_research_runs where id=?',(rid,))
   c.execute('delete from creator_research_batches where id not in (select batch_id from creator_research_batch_items)')
   for rid in p['deleteStandaloneRunIds']: c.execute('delete from runs where id=?',(rid,))
   # Comparisons built from the removed report set cannot remain as current analysis.
   c.execute('delete from comparison_projects')
   c.commit()
  except Exception:
   c.rollback(); shutil.rmtree(dest); raise
 for f in p['deleteFiles']: pathlib.Path(f['path']).unlink()
 return {'deletedCreatorRuns':len(old),'deletedStandaloneRuns':len(p['deleteStandaloneRunIds']),
  'deletedReportFiles':len(p['deleteFiles']),'deletedBytes':sum(f['bytes'] for f in p['deleteFiles']),
  'importedRun':LATEST,'preservedPendingRun':PENDING,'rawEvidence':'preserved'}

if __name__ == '__main__':
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['plan','apply']);parser.add_argument('--project',type=pathlib.Path,required=True);parser.add_argument('--runtime',type=pathlib.Path,required=True);parser.add_argument('--plan',type=pathlib.Path,required=True);args=parser.parse_args()
 if args.mode=='plan':
  result=plan(args.project.resolve(),args.runtime.resolve());args.plan.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:len(v) if isinstance(v,list) else v for k,v in result.items()},ensure_ascii=False))
 else:
  saved=json.loads(args.plan.read_text())
  if saved['project']!=str(args.project.resolve()) or saved['runtime']!=str(args.runtime.resolve()):raise RuntimeError('Plan roots mismatch')
  result=apply(saved);args.plan.with_suffix('.receipt.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
