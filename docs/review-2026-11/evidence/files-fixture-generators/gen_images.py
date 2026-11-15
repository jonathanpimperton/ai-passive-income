# Generate image fixtures for the FILES review. Writes into ./fixtures
import os, random, io, struct
from PIL import Image, ImageDraw, ImageFont
random.seed(1)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')
os.makedirs(OUT, exist_ok=True)
P = lambda n: os.path.join(OUT, n)

def photo(w, h, seed=0):
    """Photo-like: smooth gradients + mid-frequency noise (compresses like a real photo)."""
    import numpy as np
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:h, 0:w].astype('float32')
    r = 128 + 100*np.sin(x/(w/7) + seed) * np.cos(y/(h/5))
    g = 128 + 100*np.sin(y/(h/9) + seed*2)
    b = 128 + 100*np.cos((x+y)/(w/6))
    arr = np.stack([r, g, b], -1)
    arr += rng.normal(0, 18, arr.shape)
    arr = np.clip(arr, 0, 255).astype('uint8')
    return Image.fromarray(arr, 'RGB')

try:
    import numpy as np
except ImportError:
    raise SystemExit('numpy needed')

# 1. Typical phone photo 4032x3024 q92
im = photo(4032, 3024, 1)
im.save(P('photo-4032x3024.jpg'), quality=92)

# 2. EXIF rotated: stored 600x300 landscape, red block at stored top-left, orientation=6 (display = rotate 90 CW -> 300x600 portrait, red at top-right)
im = Image.new('RGB', (600, 300), (240, 240, 240))
d = ImageDraw.Draw(im); d.rectangle([0, 0, 99, 99], fill=(255, 0, 0)); d.rectangle([500, 200, 599, 299], fill=(0, 0, 255))
exif = Image.Exif(); exif[0x0112] = 6; exif[0x010F] = 'TestCam'; exif[0x8825] = {}  # orientation, make
im.save(P('exif-rot6-600x300.jpg'), quality=95, exif=exif.tobytes())

# 3. CMYK JPEG (Adobe marker, as Photoshop writes)
im = photo(1200, 800, 3).convert('CMYK')
im.save(P('cmyk-1200x800.jpg'), quality=90)

# 4. Transparent PNG (logo on transparent bg) 800x600
im = Image.new('RGBA', (800, 600), (0, 0, 0, 0))
d = ImageDraw.Draw(im); d.ellipse([200, 100, 600, 500], fill=(230, 57, 70, 255)); d.rectangle([0, 0, 50, 50], fill=(0, 128, 0, 128))
im.save(P('transparent-800x600.png'))

# 5. Opaque screenshot-like PNG (flat UI + text) 1920x1080
im = Image.new('RGB', (1920, 1080), (255, 255, 255))
d = ImageDraw.Draw(im)
for i in range(40):
    d.rectangle([40, 40 + i*25, 1880, 60 + i*25], fill=(245, 245, 245) if i % 2 else (255, 255, 255))
    d.text((60, 42 + i*25), f'Row {i}  Invoice INV-{1000+i}  Amount GBP {random.randint(10,9999)}.{random.randint(10,99)}  Status: PAID', fill=(20, 22, 26))
im.save(P('screenshot-1920x1080.png'), optimize=True)

# 6. Already-optimised palette PNG (small icon-like)
im = Image.new('P', (512, 512)); im.putpalette([0,0,0, 11,110,110, 255,255,255] + [0]*759)
d = ImageDraw.Draw(im); d.rectangle([0,0,511,511], fill=2); d.ellipse([56,56,456,456], fill=1); d.text((200,240), 'CR', fill=2)
im.save(P('palette-512.png'), optimize=True)

# 7. Square logo PNG for ICO (transparent, 1024)
im = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
d = ImageDraw.Draw(im); d.rounded_rectangle([64, 64, 960, 960], 160, fill=(11, 110, 110, 255)); d.ellipse([300,300,724,724], fill=(255,255,255,255))
im.save(P('logo-1024.png'))
# non-square
Image.new('RGB', (1200, 400), (11,110,110)).save(P('wide-1200x400.png'))

# 8. Animated GIF + animated WebP (3 frames: red, green, blue)
frames = [Image.new('RGB', (200, 200), c) for c in [(255,0,0),(0,255,0),(0,0,255)]]
frames[0].save(P('animated-3f.gif'), save_all=True, append_images=frames[1:], duration=200, loop=0)
frames[0].save(P('animated-3f.webp'), save_all=True, append_images=frames[1:], duration=200, loop=0)

# 9. Transparent WebP
im = Image.new('RGBA', (400, 400), (0,0,0,0)); ImageDraw.Draw(im).ellipse([50,50,350,350], fill=(0,0,255,255))
im.save(P('transparent-400.webp'), lossless=True)

# 10. Huge images
photo(16000, 12000, 5).save(P('huge-16000x12000.jpg'), quality=80)
Image.new('RGB', (20000, 1000), (200, 100, 50)).save(P('wide-20000x1000.png'))

# 11. ~49MB and ~55MB noise PNGs (incompressible)
for name, side in [('noise-49mb.png', 4040), ('noise-55mb.png', 4290)]:
    arr = np.random.default_rng(7).integers(0, 256, (side, side, 3), dtype='uint8')
    Image.fromarray(arr, 'RGB').save(P(name), compress_level=1)

# 12. Broken inputs
open(P('zero.jpg'), 'wb').close()
open(P('corrupt.jpg'), 'wb').write(b'\xff\xd8\xff\xe0' + os.urandom(5000))
import shutil
shutil.copy(P('transparent-800x600.png'), P('png-named-as.jpg'))
open(P('notanimage.png'), 'wb').write(b'%PDF-1.4\n' + os.urandom(2000))
# truncated JPEG (half file)
b = open(P('photo-4032x3024.jpg'), 'rb').read(); open(P('truncated-half.jpg'), 'wb').write(b[:len(b)//2])

# 13. Unicode / spaces filename
photo(800, 600, 9).save(P('Café façade 東京 (1).jpg'), quality=85)

# 14. Batch of 20 phone-size photos (smaller: 3000x2000 to keep time sane)
os.makedirs(P('batch20'), exist_ok=True)
for i in range(20):
    photo(3000, 2000, 100+i).save(os.path.join(OUT, 'batch20', f'IMG_{1000+i}.jpg'), quality=90)

# 15. Already heavily-compressed JPEG (q40) to test "compressor makes it bigger"
photo(1600, 1200, 11).save(P('lowq-q40.jpg'), quality=40)

# 16. JPEG2000 for PDF embedding
photo(800, 600, 12).save(P('img.jp2'), 'JPEG2000')

print('done')
for f in sorted(os.listdir(OUT)):
    fp = os.path.join(OUT, f)
    if os.path.isfile(fp): print(f, os.path.getsize(fp))
