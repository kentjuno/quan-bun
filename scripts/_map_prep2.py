
import os
from PIL import Image
R=r"F:\AntiGravity\Games\quan-bun"; RAW=os.path.join(R,"art","raw","map"); PUB=os.path.join(R,"public","art","map")
for n in ["map-hp-hue","map-hue-dn","map-dn-nt","map-nt-sg","map-sg-mientay"]:
    p=os.path.join(RAW,n+".png")
    if not os.path.exists(p): print(n,"missing"); continue
    im=Image.open(p).convert("RGB"); print(n,im.size)
    im.resize((768,1376),Image.LANCZOS).save(os.path.join(PUB,n+".webp"),"WEBP",quality=88,method=6)
    im.resize((384,688)).save(os.path.join(RAW,n+"-small.jpg"),quality=80)
