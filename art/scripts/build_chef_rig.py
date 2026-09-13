# Đầu bếp có rig + animation cho Quán Bún. Chạy trong Blender 5.x → public/models/chef.glb
# Một mesh (Chef_Mesh) gắn Armature (Chef_Rig); mỗi bộ phận gán 100% vào một xương (rigid skinning, đúng chất đồ chơi).
# Animation = action → NLA track (mỗi track thành 1 clip trong GLB): Idle, Walk, Carry, CarryIdle, Work.
# Hướng: mặt nhìn về -Y (Blender) → +Z trong three.js (export Y-up).
import bpy, math, os
from mathutils import Vector

ROOT = r"F:\AntiGravity\Games\quan-bun"
OUT = os.path.join(ROOT, "public", "models")
os.makedirs(OUT, exist_ok=True)
FPS = 24

def hexrgb(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1.0)
PAL = { "White": "#F4F4F4", "Cream": "#FFF7EA", "Red": "#E84A3B", "RedDark": "#B8362B", "Ink": "#2B2118", "Skin": "#F2C9A0", "SkinDark": "#D9A97E",
        "Brown": "#7A4B2A", "Hair": "#3A2A1E", "Navy": "#2F3A56", "Steel": "#B8C0C8", "Wood": "#8A5A2B", "Black": "#1E1E22", "Blush": "#F0A090" }
_mats = {}
def mat(name):
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new("Chef_" + name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = hexrgb(PAL[name]); b.inputs["Roughness"].default_value = 0.7
    _mats[name] = m; return m

# ---------- scene ----------
sc = bpy.data.scenes.get("ChefRig")
if sc: bpy.data.scenes.remove(sc)
sc = bpy.data.scenes.new("ChefRig"); bpy.context.window.scene = sc; sc.render.fps = FPS
for a in [a for a in bpy.data.actions if a.name.startswith("Chef_")]: bpy.data.actions.remove(a)

parts = []   # (object, bone)
def finish(ob, m, bone, bevel=0.025, smooth=False):
    ob.data.materials.clear(); ob.data.materials.append(mat(m))
    for p in ob.data.polygons: p.use_smooth = smooth
    if bevel:
        bm = ob.modifiers.new("Bevel", 'BEVEL'); bm.width = bevel; bm.segments = 2; bm.limit_method = 'ANGLE'; bm.angle_limit = math.radians(40)
    parts.append((ob, bone)); return ob
def box(name, size, loc, m, bone, rot=(0, 0, 0), bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); ob = bpy.context.active_object; ob.name = name
    ob.scale = size; ob.rotation_euler = rot; bpy.ops.object.transform_apply(scale=True, rotation=True)
    return finish(ob, m, bone, bevel)
def cyl(name, r, h, loc, m, bone, sides=14, r2=None, rot=(0, 0, 0), smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc)
    ob = bpy.context.active_object; ob.name = name; ob.rotation_euler = rot; bpy.ops.object.transform_apply(rotation=True)
    return finish(ob, m, bone, bevel=0, smooth=smooth)
def sph(name, r, loc, m, bone, scale=(1, 1, 1), subdiv=2, smooth=True):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=loc); ob = bpy.context.active_object; ob.name = name
    ob.scale = scale; bpy.ops.object.transform_apply(scale=True)
    return finish(ob, m, bone, bevel=0, smooth=smooth)

# ---------- các bộ phận (toạ độ thế giới, đứng thẳng, gốc dưới chân) ----------
HIP = 0.50; CHEST = 0.95; NECK = 1.12
# hông + chân
box("Pelvis", (0.46, 0.34, 0.16), (0, 0, HIP + 0.02), "Navy", "Hips")
for s, nm in ((-1, "L"), (1, "R")):
    x = s * 0.12
    box(f"Thigh{nm}", (0.19, 0.22, 0.26), (x, 0, HIP - 0.14), "Navy", f"Thigh.{nm}")
    box(f"Shin{nm}", (0.17, 0.2, 0.22), (x, 0, 0.16), "Navy", f"Shin.{nm}")
    box(f"Shoe{nm}", (0.19, 0.32, 0.1), (x, -0.05, 0.05), "Ink", f"Shin.{nm}", bevel=0.03)
    box(f"Sole{nm}", (0.2, 0.33, 0.03), (x, -0.05, 0.015), "Black", f"Shin.{nm}", bevel=0.01)
# thân: áo trắng, tạp dề đỏ, dây, khăn cổ, cúc
box("Torso", (0.52, 0.36, 0.44), (0, 0, HIP + 0.32), "White", "Spine")
box("Apron", (0.44, 0.05, 0.5), (0, -0.2, HIP + 0.22), "Red", "Spine", bevel=0.02)
box("ApronBib", (0.3, 0.05, 0.16), (0, -0.2, HIP + 0.55), "Red", "Spine", bevel=0.015)
box("ApronPocket", (0.16, 0.03, 0.1), (0, -0.235, HIP + 0.16), "RedDark", "Spine", bevel=0.01)
box("Belt", (0.54, 0.38, 0.06), (0, 0, HIP + 0.1), "Ink", "Spine", bevel=0.01)
for s in (-1, 1): box("Strap", (0.05, 0.04, 0.28), (s * 0.12, -0.19, HIP + 0.5), "Red", "Spine", rot=(0, s * 0.25, 0), bevel=0.01)
for i in range(3): sph("Button", 0.022, (0.17, -0.185, HIP + 0.44 - i * 0.1), "Ink", "Spine", subdiv=1)
box("Collar", (0.3, 0.3, 0.06), (0, 0, NECK - 0.02), "White", "Spine", bevel=0.02)
box("Neckerchief", (0.22, 0.1, 0.07), (0, -0.14, NECK - 0.03), "Red", "Spine", rot=(0.3, 0, 0), bevel=0.02)
# tay: cánh tay trên (áo), cẳng tay (áo + cổ tay áo), bàn tay
SH = (0.33, 0.0, CHEST + 0.02); ELB = 0.3; FORE = 0.26
for s, nm in ((-1, "L"), (1, "R")):
    x = s * SH[0]
    sph(f"Shoulder{nm}", 0.11, (x, 0, SH[2]), "White", f"UpperArm.{nm}", subdiv=1)
    box(f"UpperArm{nm}", (0.15, 0.15, ELB), (x, 0, SH[2] - ELB / 2 - 0.02), "White", f"UpperArm.{nm}")
    box(f"Forearm{nm}", (0.13, 0.13, FORE), (x, 0, SH[2] - ELB - FORE / 2 - 0.02), "White", f"Forearm.{nm}")
    box(f"Cuff{nm}", (0.15, 0.15, 0.05), (x, 0, SH[2] - ELB - FORE - 0.0), "Cream", f"Forearm.{nm}", bevel=0.01)
    sph(f"Hand{nm}", 0.085, (x, -0.02, SH[2] - ELB - FORE - 0.08), "Skin", f"Forearm.{nm}", scale=(1, 0.85, 1.1), subdiv=1)
# đầu: sọ tròn, tai, mũi, mắt, lông mày, ria, má hồng, nón bếp cao có nếp
HEAD_Y = NECK + 0.3
sph("Skull", 0.3, (0, 0, HEAD_Y), "Skin", "Head", scale=(1, 0.95, 1.02))
for s in (-1, 1):
    sph("Ear", 0.055, (s * 0.29, 0.02, HEAD_Y - 0.03), "Skin", "Head", scale=(0.6, 1, 1), subdiv=1)
    sph("Eye", 0.038, (s * 0.1, -0.265, HEAD_Y + 0.03), "Ink", "Head", subdiv=1)
    sph("EyeShine", 0.012, (s * 0.1 - 0.012, -0.30, HEAD_Y + 0.045), "White", "Head", subdiv=1)
    box("Brow", (0.09, 0.02, 0.025), (s * 0.1, -0.27, HEAD_Y + 0.1), "Hair", "Head", rot=(0, s * -0.15, 0), bevel=0.005)
    sph("Blush", 0.035, (s * 0.19, -0.2, HEAD_Y - 0.06), "Blush", "Head", scale=(1, 0.4, 0.8), subdiv=1)
sph("Nose", 0.055, (0, -0.3, HEAD_Y - 0.03), "SkinDark", "Head", subdiv=1)
box("Moustache", (0.2, 0.05, 0.035), (0, -0.28, HEAD_Y - 0.1), "Hair", "Head", bevel=0.012)
box("Mouth", (0.1, 0.02, 0.018), (0, -0.29, HEAD_Y - 0.15), "RedDark", "Head", bevel=0)
cyl("Chin", 0.16, 0.08, (0, 0.0, HEAD_Y - 0.28), "Skin", "Head", sides=14, r2=0.22)
cyl("HatBand", 0.3, 0.09, (0, 0, HEAD_Y + 0.25), "White", "Head", sides=16)
cyl("HatRibbon", 0.31, 0.03, (0, 0, HEAD_Y + 0.22), "Red", "Head", sides=16)
cyl("HatTop", 0.3, 0.34, (0, 0, HEAD_Y + 0.46), "White", "Head", sides=16, r2=0.34)
for i in range(8):   # nếp nón
    a = i / 8 * math.tau
    cyl("HatPleat", 0.05, 0.3, (math.cos(a) * 0.32, math.sin(a) * 0.32, HEAD_Y + 0.5), "White", "Head", sides=8)
sph("HatPuff", 0.3, (0, 0, HEAD_Y + 0.66), "White", "Head", scale=(1.1, 1.1, 0.5))

# ---------- armature ----------
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
rig = bpy.context.active_object; rig.name = "Chef_Rig"; rig.data.name = "Chef_Rig"
eb = rig.data.edit_bones
for b in list(eb): eb.remove(b)
def bone(name, head, tail, parent=None, connect=False):
    b = eb.new(name); b.head = Vector(head); b.tail = Vector(tail)
    if parent: b.parent = eb[parent]; b.use_connect = connect
    return b
bone("Root", (0, 0, 0), (0, 0.2, 0))
bone("Hips", (0, 0, HIP), (0, 0, HIP + 0.15), "Root")
bone("Spine", (0, 0, HIP + 0.15), (0, 0, NECK), "Hips", True)
bone("Head", (0, 0, NECK), (0, 0, NECK + 0.5), "Spine", True)
bone("Carry", (0, -0.42, HIP + 0.35), (0, -0.42, HIP + 0.5), "Spine")      # điểm gắn đồ cầm (trước bụng)
for s, nm in ((-1, "L"), (1, "R")):
    x = s * SH[0]
    bone(f"UpperArm.{nm}", (x, 0, SH[2]), (x, 0, SH[2] - ELB - 0.02), "Spine")
    bone(f"Forearm.{nm}", (x, 0, SH[2] - ELB - 0.02), (x, 0, SH[2] - ELB - FORE - 0.12), f"UpperArm.{nm}", True)
    bone(f"Thigh.{nm}", (s * 0.12, 0, HIP), (s * 0.12, 0, HIP - 0.26), "Hips")
    bone(f"Shin.{nm}", (s * 0.12, 0, HIP - 0.26), (s * 0.12, 0, 0.02), f"Thigh.{nm}", True)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------- gộp mesh, gán vertex group theo xương ----------
for ob, bn in parts:
    vg = ob.vertex_groups.new(name=bn); vg.add(list(range(len(ob.data.vertices))), 1.0, 'REPLACE')
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    for m in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)   # bevel → geometry trước khi join
    ob.select_set(False)
bpy.ops.object.select_all(action='DESELECT')
for ob, _ in parts: ob.select_set(True)
bpy.context.view_layer.objects.active = parts[0][0]
bpy.ops.object.join()
mesh = bpy.context.active_object; mesh.name = "Chef_Mesh"; mesh.data.name = "Chef_Mesh"
mesh.parent = rig; am = mesh.modifiers.new("Armature", 'ARMATURE'); am.object = rig
root = bpy.data.objects.new("Chef", None); sc.collection.objects.link(root); root["forward"] = "+Z"; rig.parent = root

# ---------- animation ----------
# Quy ước: location trên Hips theo trục xương (Y local = lên). Góc (độ) trên pose bone, chế độ XYZ Euler: X = gập trước/sau (+ = ngả về phía trước, vì trục xương hướng lên và mặt nhìn -Y)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
pb = rig.pose.bones
for b in pb: b.rotation_mode = 'XYZ'
D = math.radians

def clear_pose():
    for b in pb: b.rotation_euler = (0, 0, 0); b.location = (0, 0, 0)

def key(frame, rots=None, locs=None):
    """rots: {bone: (x,y,z) độ}; locs: {bone: (x,y,z) m}. Xương không nhắc tới giữ 0."""
    rots = rots or {}; locs = locs or {}
    for b in pb:
        r = rots.get(b.name, (0, 0, 0)); b.rotation_euler = (D(r[0]), D(r[1]), D(r[2])); b.keyframe_insert("rotation_euler", frame=frame)
        if b.name in ("Hips", "Root", "Carry"):
            b.location = locs.get(b.name, (0, 0, 0)); b.keyframe_insert("location", frame=frame)

def make_action(name, length, poses, cyclic=True):
    """poses: list (frame, rots, locs). Tạo action mới, push lên NLA track cùng tên."""
    rig.animation_data_create()
    act = bpy.data.actions.new("Chef_" + name); rig.animation_data.action = act
    try: rig.animation_data.action_slot = act.slots[0] if len(act.slots) else act.slots.new(id_type='OBJECT', name="Chef")
    except Exception: pass
    for f, r, l in poses: key(f, r, l)
    if cyclic and poses and poses[-1][0] != length: key(length, poses[0][1], poses[0][2])
    act.frame_range = (0, length)
    for fc in act.fcurves if hasattr(act, "fcurves") else []:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    rig.animation_data.action = None
    tr = rig.animation_data.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, 0, act); st.name = name
    return act

ARM_UP = (-70, 0, 0)      # cánh tay đưa ra trước (gập vai) → khi cầm đồ
FORE_UP = (-55, 0, 0)
IDLE = [
    (0,  {"Spine": (2, 0, 0), "Head": (0, 0, 0), "UpperArm.L": (0, 0, 8), "UpperArm.R": (0, 0, -8)}, {"Hips": (0, 0, 0)}),
    (24, {"Spine": (4, 0, 0), "Head": (2, 0, 10), "UpperArm.L": (3, 0, 8), "UpperArm.R": (3, 0, -8)}, {"Hips": (0, -0.012, 0)}),
    (48, {"Spine": (2, 0, 0), "Head": (0, 0, -8), "UpperArm.L": (0, 0, 8), "UpperArm.R": (0, 0, -8)}, {"Hips": (0, 0, 0)}),
]
make_action("Idle", 72, IDLE + [(72, IDLE[0][1], IDLE[0][2])], cyclic=False)

def walk_frames(arms_carry=False):
    out = []
    for i, ph in enumerate((0, 0.25, 0.5, 0.75)):
        f = int(ph * 24); sw = math.sin(ph * math.tau); sw2 = math.sin(ph * math.tau + math.pi / 2)
        thighL, thighR = 32 * sw, -32 * sw
        shinL = max(0, -sw) * 45 + 8; shinR = max(0, sw) * 45 + 8
        if arms_carry:
            armL = (ARM_UP[0] + 4 * sw2, 0, 6); armR = (ARM_UP[0] + 4 * sw2, 0, -6); foreL = foreR = (FORE_UP[0], 0, 0)
        else:
            armL = (-28 * sw, 0, 6); armR = (28 * sw, 0, -6); foreL = (-20, 0, 0); foreR = (-20, 0, 0)
        bob = abs(math.sin(ph * math.tau * 1)) * 0.04
        out.append((f, {
            "Thigh.L": (-thighL, 0, 0), "Thigh.R": (-thighR, 0, 0), "Shin.L": (shinL, 0, 0), "Shin.R": (shinR, 0, 0),
            "UpperArm.L": armL, "UpperArm.R": armR, "Forearm.L": foreL, "Forearm.R": foreR,
            "Spine": (8, 0, -6 * sw), "Head": (-4, 0, 4 * sw), "Hips": (0, 0, 5 * sw),
        }, {"Hips": (0, bob, 0)}))
    return out
make_action("Walk", 24, walk_frames(False))
make_action("Carry", 24, walk_frames(True))
CARRY_IDLE = [
    (0,  {"UpperArm.L": (ARM_UP[0], 0, 6), "UpperArm.R": (ARM_UP[0], 0, -6), "Forearm.L": FORE_UP, "Forearm.R": FORE_UP, "Spine": (3, 0, 0)}, {"Hips": (0, 0, 0)}),
    (24, {"UpperArm.L": (ARM_UP[0] + 3, 0, 6), "UpperArm.R": (ARM_UP[0] + 3, 0, -6), "Forearm.L": FORE_UP, "Forearm.R": FORE_UP, "Spine": (5, 0, 0), "Head": (3, 0, 0)}, {"Hips": (0, -0.01, 0)}),
]
make_action("CarryIdle", 48, CARRY_IDLE)
WORK = []   # hai tay thay phiên nhúng/khuấy trước bụng, người hơi khom, đầu nhìn xuống
for i in range(4):
    f = i * 6; ph = i / 4; sw = math.sin(ph * math.tau)
    WORK.append((f, {
        "Spine": (16, 0, 0), "Head": (14, 0, 6 * sw),
        "UpperArm.L": (-55 + 18 * sw, 0, 10), "UpperArm.R": (-55 - 18 * sw, 0, -10),
        "Forearm.L": (-70 - 15 * sw, 0, 0), "Forearm.R": (-70 + 15 * sw, 0, 0),
        "Thigh.L": (-4, 0, 0), "Thigh.R": (-4, 0, 0), "Shin.L": (6, 0, 0), "Shin.R": (6, 0, 0),
    }, {"Hips": (0, 0, -0.02 - 0.01 * abs(sw))}))
make_action("Work", 24, WORK)
bpy.ops.object.mode_set(mode='OBJECT')
clear_pose()

# ---------- export ----------
bpy.ops.object.select_all(action='DESELECT')
for o in (root, rig, mesh): o.select_set(True)
bpy.context.view_layer.objects.active = rig
path = os.path.join(OUT, "chef.glb")
bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_apply=True, export_yup=True,
                          export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_range=False,
                          export_skins=True, export_def_bones=False, export_rest_position_armature=True, use_active_scene=True)
print("CHEF_GLB", os.path.getsize(path), "verts", len(mesh.data.vertices), "tracks", [t.name for t in rig.animation_data.nla_tracks])
