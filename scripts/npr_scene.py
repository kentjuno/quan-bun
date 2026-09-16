
# Render màn Quầy POV từ model 3D có sẵn, tô theo phong cách art C (NPR).
# Chạy: blender.exe -b -P scripts/npr_scene.py
# Ra: art/npr/room.png (nền), art/npr/st-<ten>.png (sprite từng trạm), art/npr/zones.json (toạ độ %).
import bpy, os, json, math
from mathutils import Vector

R = r"F:\AntiGravity\Games\quan-bun"
OUT = os.path.join(R, "art", "npr")
os.makedirs(OUT, exist_ok=True)
W, H = 768, 1376

# ---- bố cục quầy POV: x ngang (âm = trái), y sâu (âm = phía người chơi), z cao ----
LAYOUT = {
    "wall":    (0.0,  1.65, 0.0, 5.2),   # (x, y, z, scale ngang) — tường sau
    "pot":     (-1.85, 1.05, 0.0, 1.0),
    "sink":    (0.10, 1.05, 0.0, 1.0),
    "stove":   (1.95, 1.05, 0.0, 1.0),
    "shelf":   (0.0,  0.30, 0.0, 3.6),   # tủ prep chạy ngang
    "counter": (0.0, -0.75, 0.0, 3.6),   # mặt thớt trước mặt
    "trash":   (2.35,-0.35, 0.0, 0.8),
}
CAM = dict(loc=(0.0, -4.20, 2.55), rot=(math.radians(72), 0.0, 0.0), lens=26)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(R, "public", "models", "kitchen.glb"))

# gom prototype theo tên trạm
protos = {}
for ob in list(bpy.data.objects):
    if ob.name.startswith("Station_"):
        protos[ob.name.split(".")[0].replace("Station_", "")] = ob
for ob in protos.values():
    ob.hide_render = True
    ob.hide_viewport = True

def place(kind, x, y, z, sx):
    src = protos.get(kind)
    if not src: return None
    root = bpy.data.objects.new("P_" + kind, None)
    bpy.context.collection.objects.link(root)
    for child in src.children:
        d = child.copy(); d.data = child.data.copy()
        bpy.context.collection.objects.link(d)
        d.parent = root
        d.matrix_parent_inverse = root.matrix_world.inverted()
        d.hide_render = False; d.hide_viewport = False
        d.location = child.location.copy()
    root.location = Vector((x, y, z))
    root.scale = Vector((sx, 1.0, 1.0)) if kind in ("wall", "shelf", "counter") else Vector((sx, sx, sx))
    return root

placed = {}
for k, (x, y, z, sx) in LAYOUT.items():
    r = place(k, x, y, z, sx)
    if r: placed[k] = r
bpy.context.view_layer.update()

# ---- NPR: mọi vật liệu thành 2 tông phẳng, không bóng ----
def cel(mat):
    base = (0.8, 0.78, 0.72, 1)
    if mat.use_nodes:
        for n in mat.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                base = tuple(n.inputs["Base Color"].default_value); break
    mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs[0].default_value = (1, 1, 1, 1)
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.74, 0.70, 0.64, 1)
    ramp.color_ramp.elements[1].position = 0.46
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    mul = nt.nodes.new("ShaderNodeMixRGB"); mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1.0
    mul.inputs[2].default_value = base
    emi = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(dif.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], mul.inputs[1])
    nt.links.new(mul.outputs[0], emi.inputs[0])
    nt.links.new(emi.outputs[0], out.inputs[0])
for m in bpy.data.materials:
    try: cel(m)
    except Exception: pass

# ---- đèn: một mặt trời chếch trái trên, đủ để ramp chia 2 tông ----
sun_d = bpy.data.lights.new("Sun", type="SUN"); sun_d.energy = 3.0
sun = bpy.data.objects.new("Sun", sun_d); bpy.context.collection.objects.link(sun)
sun.rotation_euler = (math.radians(52), 0, math.radians(38))

# ---- camera ----
cam_d = bpy.data.cameras.new("Cam"); cam_d.lens = CAM["lens"]
cam = bpy.data.objects.new("Cam", cam_d); bpy.context.collection.objects.link(cam)
cam.location = Vector(CAM["loc"]); cam.rotation_euler = CAM["rot"]
bpy.context.scene.camera = cam

# ---- render + Freestyle nét mực nâu ----
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.film_transparent = True
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.render.use_freestyle = True
vl = sc.view_layers[0]
vl.use_freestyle = True
fs = vl.freestyle_settings
if not fs.linesets: fs.linesets.new("ink")
ls = fs.linesets[0]
ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
st = ls.linestyle
if st is None:
    st = bpy.data.linestyles.new("ink")
    ls.linestyle = st
st.color = (0.231, 0.165, 0.118)     # #3b2a1e
st.thickness = 2.6

def render_to(path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

# 1) cả phòng
for r in placed.values(): r.hide_render = False
render_to(os.path.join(OUT, "room.png"))

# 2) từng trạm riêng, nền trong
for k, r in placed.items():
    for k2, r2 in placed.items():
        hide = (k2 != k)
        r2.hide_render = hide
        for c in r2.children: c.hide_render = hide
    render_to(os.path.join(OUT, "st-" + k + ".png"))
for k, r in placed.items():
    r.hide_render = False
    for c in r.children: c.hide_render = False

# 3) toạ độ màn hình của từng trạm (đây là thứ thay cho đo mắt)
from bpy_extras.object_utils import world_to_camera_view
def screen_box(root):
    pts = []
    for c in root.children:
        if c.type != "MESH": continue
        for corner in c.bound_box:
            wp = c.matrix_world @ Vector(corner)
            co = world_to_camera_view(sc, cam, wp)
            pts.append((co.x, 1.0 - co.y))
    if not pts: return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, x1 = max(0.0, min(xs)), min(1.0, max(xs))
    y0, y1 = max(0.0, min(ys)), min(1.0, max(ys))
    return {"x": round(x0 * 100, 1), "y": round(y0 * 100, 1),
            "w": round((x1 - x0) * 100, 1), "h": round((y1 - y0) * 100, 1)}

zones = {k: screen_box(r) for k, r in placed.items()}
json.dump({"scene": {"w": W, "h": H}, "zones": zones}, open(os.path.join(OUT, "zones.json"), "w"), indent=1)
print("NPR_DONE", json.dumps(zones))
