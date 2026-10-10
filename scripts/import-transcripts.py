"""Merge locally generated German transcripts into the static website."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
review = json.loads((root / 'data/transcription-review.json').read_text())
p = root / 'data/tracks.js'
tracks = json.loads(p.read_text().removeprefix('window.TRACKS = ').rstrip(';\n'))
for track in tracks:
    text = track.get('text', '').strip() or review.get(track['id'], {}).get('text', '').strip()
    if not text:
        raise ValueError(f"Missing subtitle: {track['id']}")
    track['text'] = text
p.write_text('window.TRACKS = ' + json.dumps(tracks, ensure_ascii=False, indent=2) + ';\n')
(root / 'data/subtitles.json').write_text(json.dumps({t['id']: t['text'] for t in tracks}, ensure_ascii=False, indent=2) + '\n')
print(f'Imported {len(tracks)} German subtitles.')
