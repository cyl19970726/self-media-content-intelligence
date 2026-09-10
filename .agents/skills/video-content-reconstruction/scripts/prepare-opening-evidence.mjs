#!/usr/bin/env node
// Host-only preparation, before media-preparation.json freezes the evidence pack.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs, requireArg, readJson, writeJson, extractFrame, round, writeContactSheet } from './lib.mjs';
const args=parseArgs(process.argv.slice(2)), video=requireArg(args,'video'), packPath=requireArg(args,'pack');
if (existsSync(join(dirname(dirname(packPath)), 'media-preparation.json'))) throw new Error('Opening preparation cannot mutate a frozen evidence revision');
const pack=readJson(packPath), end=Math.min(10,pack.media.duration), safeEnd=Math.max(0,Math.min(end,pack.media.duration-.04));
const times=[];
for(let t=0;t<safeEnd;t+=.5) times.push(round(t));
times.push(round(safeEnd));
const frames=times.map((time,index)=>{
  const id=`OPEN-${String(index+1).padStart(4,'0')}`,frame=`frames/opening/${id.toLowerCase()}.jpg`;
  extractFrame(video,time,join(dirname(packPath),frame),540,960);
  return {id,time,frame,purpose:'opening_half_second_inspection'};
});
pack.frameIndex=[...(pack.frameIndex??[]).filter(frame=>!frame.id.startsWith('OPEN-')), ...frames];
pack.openingProbe={intervalSeconds:.5,end,frames,contactSheet:'opening-contact.jpg'};
if(!writeContactSheet(frames.map(frame=>join(dirname(packPath),frame.frame)),join(dirname(packPath),'opening-contact.jpg'),5)) throw new Error('Opening contact sheet failed');
// Label the contact sheet, keeping the evidence frames themselves untouched.
execFileSync('python3', ['-c', `
import json,sys,math
from PIL import Image,ImageDraw
rows=json.loads(sys.argv[1]); out=sys.argv[2]
w,h=240,458
canvas=Image.new('RGB',(5*w,math.ceil(len(rows)/5)*h),'#151515')
draw=ImageDraw.Draw(canvas)
for i,row in enumerate(rows):
 im=Image.open(row['path']); im.thumbnail((232,420))
 x,y=(i%5)*w,(i//5)*h
 canvas.paste(im,(x+4,y+30))
 draw.text((x+6,y+8),row['id']+'   '+format(row['time'],'.2f')+' s',fill='white')
canvas.save(out,quality=92)
`, JSON.stringify(frames.map(frame=>({...frame,path:join(dirname(packPath),frame.frame)}))), join(dirname(packPath),'opening-contact.jpg')]);
writeJson(packPath,pack);
