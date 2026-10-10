"""Build a static German/Traditional Chinese glossary; the website needs no model."""
import json,re
from pathlib import Path
import torch
from transformers import MarianMTModel, MarianTokenizer
from opencc import OpenCC
root=Path(__file__).resolve().parents[1]
tracks=json.loads((root/'data/tracks.js').read_text().removeprefix('window.TRACKS = ').rstrip(';\n'))
overrides=json.loads((root/'data/glossary-overrides.json').read_text())
words={}
for track in tracks:
 for word in re.findall(r'[^\W\d_]+(?:[-’\'][^\W\d_]+)*',track['text']):
  key=word.lower()
  if key not in words or word[0].isupper():words[key]=word
out=root/'data/glossary-generated.json';generated=json.loads(out.read_text()) if out.exists() else {}
remaining=[key for key in sorted(words) if key not in overrides['words'] and key not in generated]
model_id='Helsinki-NLP/opus-mt-de-ZH'
cache='/private/tmp/german-translation-models'
tokenizer=MarianTokenizer.from_pretrained(model_id,cache_dir=cache)
model=MarianMTModel.from_pretrained(model_id,cache_dir=cache)
torch.set_num_threads(6)
# CPU keeps small word batches predictable across desktop devices.
model.eval();cc=OpenCC('s2twp')
for start in range(0,len(remaining),32):
 keys=remaining[start:start+32]
 inputs=tokenizer(['>>zh_TW<< '+words[key] for key in keys],return_tensors='pt',padding=True,truncation=True)
 with torch.inference_mode():outputs=model.generate(**inputs,num_beams=4,max_new_tokens=32)
 for key,text in zip(keys,tokenizer.batch_decode(outputs,skip_special_tokens=True)):
  generated[key]=cc.convert(text.strip())
 tmp=out.with_suffix('.tmp');tmp.write_text(json.dumps(generated,ensure_ascii=False,indent=2)+'\n');tmp.replace(out)
 print(f'Translated {min(start+32,len(remaining))}/{len(remaining)} words',flush=True)
merged={**generated,**overrides['words']}
(root/'data/glossary.js').write_text('window.GLOSSARY = '+json.dumps({'words':merged,'phrases':overrides['phrases']},ensure_ascii=False,indent=2)+';\n')
print(f'Glossary complete: {len(words)} subtitle words covered.',flush=True)
