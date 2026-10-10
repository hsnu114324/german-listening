"""Generate German subtitles locally with faster-whisper; not used by the website."""
import argparse
import json
from pathlib import Path
from faster_whisper import WhisperModel
import av
import numpy as np

def decode(path):
    resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
    arrays = []
    with av.open(str(path)) as container:
        for frame in container.decode(audio=0):
            frame.pts = None
            arrays.extend(f.to_ndarray().reshape(-1) for f in resampler.resample(frame))
        arrays.extend(f.to_ndarray().reshape(-1) for f in resampler.resample(None))
    return np.concatenate(arrays).astype(np.float32) / 32768.0


parser = argparse.ArgumentParser()
parser.add_argument('--model', default='small')
parser.add_argument('--model-cache', default='/private/tmp/german-whisper-models')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = root / 'data' / 'transcription-review.json'
existing = json.loads(output.read_text()) if output.exists() else {}
model = WhisperModel(args.model, device='cpu', compute_type='int8', cpu_threads=6, download_root=args.model_cache)
files = sorted((root / 'audio').glob('*.mp3'))
for index, path in enumerate(files, 1):
    if path.stem in existing:
        continue
    segments, info = model.transcribe(decode(path), language='de', task='transcribe', beam_size=5, condition_on_previous_text=False, vad_filter=False)
    segments = list(segments)
    text = ' '.join(s.text.strip() for s in segments).strip()
    existing[path.stem] = {
        'text': text,
        'model': args.model,
        'segments': [{'start': s.start, 'end': s.end, 'text': s.text.strip(), 'avg_logprob': s.avg_logprob, 'no_speech_prob': s.no_speech_prob} for s in segments],
    }
    temporary = output.with_suffix('.tmp')
    temporary.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(output)
    print(f'[{index}/{len(files)}] {path.stem}: {text}', flush=True)
print('Transcription complete.', flush=True)
