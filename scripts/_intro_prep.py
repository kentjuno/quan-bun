
import os
from PIL import Image
R=r"F:\AntiGravity\Games\quan-bun"; RAW=os.path.join(R,"art","raw","intro"); PUB=os.path.join(R,"public","art","intro"); os.makedirs(PUB,exist_ok=True)
for n in ["intro-1","intro-2","intro-3","intro-4"]:
    p=os.path.join(RAW,n+".png")
    if not os.path.exists(p): continue
    im=Image.open(p).convert("RGB"); im.thumbnail((900,1200)); im.save(os.path.join(PUB,n+".webp"),"WEBP",quality=82,method=6)
    im.resize((300,400)).save(os.path.join(RAW,n+"-small.jpg"),quality=75)
