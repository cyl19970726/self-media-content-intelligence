import importlib.util
import json
import pathlib
import sqlite3
import shutil
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('cleanup', pathlib.Path(__file__).with_name('clean-legacy-research-data.py'))
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)

class CleanupTest(unittest.TestCase):
 def test_preserves_media_and_latest_and_removes_old_registration(self):
  with tempfile.TemporaryDirectory() as temp:
   project=pathlib.Path(temp)/'project'; runtime=pathlib.Path(temp)/'runtime'
   (project/'.runtime/runs'/cleanup.LATEST/'video-reconstructions/6a8ae3190000000028022b9f').mkdir(parents=True)
   latest=project/'.runtime/runs'/cleanup.LATEST/'video-reconstructions/6a8ae3190000000028022b9f/reconstruction.json'
   latest.write_text(json.dumps({'builderLenses':{k:{} for k in cleanup.LENSES}}))
   runtime.mkdir(); old=runtime/'runs/old/video-reconstructions/post';old.mkdir(parents=True)
   (old/'reconstruction.json').write_text('{}');(old/'source-video.mp4').write_bytes(b'original')
   for root in [runtime,project/'.runtime']:
    with sqlite3.connect(root/'self-media.sqlite') as c:
     c.executescript('''CREATE TABLE creator_research_runs(id TEXT PRIMARY KEY,profile_url TEXT,status TEXT,current_stage TEXT,creator_id TEXT,created_at TEXT,updated_at TEXT,run_json TEXT);
CREATE TABLE runs(id TEXT);CREATE TABLE research_jobs(run_id TEXT,status TEXT);CREATE TABLE research_events(run_id TEXT);CREATE TABLE creator_research_batch_items(batch_id TEXT,run_id TEXT);CREATE TABLE creator_research_batches(id TEXT);CREATE TABLE comparison_projects(id TEXT);''')
     rid='old' if root==runtime else cleanup.LATEST
     c.execute('insert into creator_research_runs values(?,?,?,?,?,?,?,?)',(rid,'url','ready','done','author','','',json.dumps({'id':rid})))
   plan=cleanup.plan(project,runtime); self.assertEqual(len(plan['deleteFiles']),1)
   (old/'reconstruction.json').write_text('{"changed":true}')
   with self.assertRaises(RuntimeError):cleanup.apply(plan)
   self.assertTrue((old/'source-video.mp4').exists())
   # A previous interruption after copying must be resumable only for identical data.
   shutil.copytree(project/'.runtime/runs'/cleanup.LATEST,runtime/'runs'/cleanup.LATEST)
   result=cleanup.apply(cleanup.plan(project,runtime));self.assertEqual(result['deletedCreatorRuns'],1)
   self.assertFalse((old/'reconstruction.json').exists());self.assertEqual((old/'source-video.mp4').read_bytes(),b'original')
   self.assertTrue((runtime/'runs'/cleanup.LATEST/'video-reconstructions/6a8ae3190000000028022b9f/reconstruction.json').exists())
   with sqlite3.connect(runtime/'self-media.sqlite') as c:self.assertEqual(c.execute('select id from creator_research_runs').fetchall(),[(cleanup.LATEST,)])

if __name__=='__main__':unittest.main()
