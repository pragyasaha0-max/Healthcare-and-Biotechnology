import cv2, numpy as np
SRC='/root/.claude/uploads/bf046f21-02dc-5525-b4de-a1670223633b/0ada7abf-image.png'
src=cv2.imread(SRC)
def save(name,img,scale=2,q=88):
    out=cv2.resize(img,None,fx=scale,fy=scale,interpolation=cv2.INTER_LANCZOS4) if scale!=1 else img
    cv2.imwrite(f'img/{name}.jpg',out,[cv2.IMWRITE_JPEG_QUALITY,q]); print(name,out.shape[1],out.shape[0])

# ---- hero: remove the baked text, buttons, avatars and the floating card ----
y0,y1=55,373
hero=src[y0:y1,0:1024].copy(); H,W=hero.shape[:2]
b=hero.astype(int); luma=0.299*b[...,2]+0.587*b[...,1]+0.114*b[...,0]
mask=np.zeros((H,W),np.uint8)
dark=(luma<150)
teal=(b[...,0]>b[...,2]-10)&(b[...,1]>b[...,2]+25)&(luma<190)   # teal letters ("Life.")
for (x0,ya,x1,yb) in [(45,100,300,122),(45,122,395,168),(45,180,360,238),(45,244,360,290),(45,300,320,356)]:
    r=np.zeros((H,W),np.uint8); r[ya-y0:yb-y0,x0:x1]=1
    mask[(r==1)&(dark|teal)]=255
mask=cv2.dilate(mask,np.ones((3,3),np.uint8),iterations=3)
# solid shapes: the two buttons and the avatar row
for (x0,ya,x1,yb) in [(48,246,216,288),(226,246,354,288),(48,306,188,342)]:
    cv2.rectangle(mask,(x0,ya-y0),(x1,yb-y0),255,-1)
hero=cv2.inpaint(hero,mask,6,cv2.INPAINT_TELEA)
# the floating card: replace with smooth background taken from its surroundings
card=np.zeros((H,W),np.uint8); cv2.rectangle(card,(796,92-y0),(996,346-y0),255,-1)
f=hero.astype(np.float32); wgt=(card==0).astype(np.float32)
num=cv2.GaussianBlur(f*wgt[...,None],(0,0),28); den=cv2.GaussianBlur(wgt,(0,0),28)[...,None]
fill=num/np.maximum(den,1e-3)
soft=cv2.GaussianBlur(card.astype(np.float32)/255,(0,0),4)[...,None]
hero=np.clip(f*(1-soft)+fill*soft,0,255).astype(np.uint8)
save('hero',hero)

# ---- therapeutic-area photos (six cards) ----
cols=[(49,198),(210,355),(368,513),(526,670),(683,826),(839,983)]
for i,(a,c) in enumerate(cols,1): save(f'a{i}',src[628:716,a+1:c-1])
# ---- lab photo ----
save('lab',src[938:1124,56:514])
# ---- world map: remove the baked pins so animated ones can be drawn ----
m=src[1146:1264,552:978].copy(); mb=m.astype(int)
pin=(mb[...,2]<110)&(mb[...,1]>120)&(mb[...,0]>110)&(mb[...,1]>mb[...,2]+40)
pm=cv2.dilate(pin.astype(np.uint8)*255,np.ones((3,3),np.uint8),iterations=4)
m=cv2.inpaint(m,pm,5,cv2.INPAINT_TELEA)
save('map',m)
ys,xs=np.where(cv2.dilate(pin.astype(np.uint8),np.ones((3,3),np.uint8),iterations=1)>0)
print('pin pixels',len(xs))
