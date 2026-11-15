# Encrypted PDF fixtures via pypdf (reads our own generated text-3p.pdf / photos-10p.pdf)
import os
from pypdf import PdfReader, PdfWriter
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')
P = lambda n: os.path.join(OUT, n)

def enc(src, dst, user, owner, alg):
    r = PdfReader(P(src)); w = PdfWriter()
    for p in r.pages: w.add_page(p)
    # permissions: printing allowed, modification/copy disallowed (typical bank statement)
    w.encrypt(user_password=user, owner_password=owner, algorithm=alg, permissions_flag=0b0100)
    with open(P(dst), 'wb') as f: w.write(f)

enc('text-3p.pdf', 'enc-user-pw-aes128.pdf', 'secret', 'owner', 'AES-128')
enc('text-3p.pdf', 'enc-owner-only-aes128.pdf', '', 'owner', 'AES-128')   # opens without password, restricted
enc('text-3p.pdf', 'enc-owner-only-rc4.pdf', '', 'owner', 'RC4-128')
enc('photos-10p.pdf', 'enc-owner-only-photos.pdf', '', 'owner', 'AES-128')
enc('text-3p.pdf', 'enc-owner-only-aes256.pdf', '', 'owner', 'AES-256')
for f in sorted(os.listdir(OUT)):
    if f.startswith('enc-'): print(f, os.path.getsize(P(f)))
