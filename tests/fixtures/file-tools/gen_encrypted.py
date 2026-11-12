"""Encrypted copy of photo-jpeg.pdf (owner password only: opens without a
password, editing restricted - the bank-statement pattern from FILES-02).
The four small enc-*.pdf text fixtures come from the review's generator and
are encrypted the same way. Requires pypdf. Run from the repo root."""
import os
from pypdf import PdfReader, PdfWriter

HERE = os.path.dirname(os.path.abspath(__file__))
r = PdfReader(os.path.join(HERE, 'photo-jpeg.pdf'))
w = PdfWriter()
for p in r.pages:
    w.add_page(p)
w.encrypt(user_password='', owner_password='owner', algorithm='AES-128', permissions_flag=0b0100)
with open(os.path.join(HERE, 'enc-owner-only-photo.pdf'), 'wb') as f:
    w.write(f)
print('enc-owner-only-photo.pdf', os.path.getsize(os.path.join(HERE, 'enc-owner-only-photo.pdf')))
