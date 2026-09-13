# Dựng bộ model low-poly "đồ chơi" cho Quán Bún và export GLB.
# Chạy trong Blender (5.x). Mọi thứ sinh từ code — sửa số rồi chạy lại.
import bpy, math, os, sys

ROOT = r"F:\AntiGravity\Games\quan-bun"
OUT = os.path.join(ROOT, "public", "models")
os.makedirs(OUT, exist_ok=True)

# ---------- bảng màu (sRGB hex → linear) ----------
def hexrgb(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1.0)

PAL = {
    "WoodDark": "#5A3A22", "Wood": "#8A5A2B", "WoodLight": "#C98B4A", "Steel": "#B8C0C8", "SteelDark": "#6B7280", "Pot": "#4B5563",
    "Cream": "#FFF7EA", "Teal": "#2A9D8F", "TealDark": "#1F7A70", "Red": "#E84A3B", "Broth": "#E8A33C", "Green": "#5FA55A", "GreenDark": "#3F7A3C",
    "Ink": "#2B2118", "Skin": "#F2C9A0", "Hair": "#2B2118", "White": "#F4F4F4", "Water": "#CFE3F2", "Noodle": "#FFF2D0", "Meat": "#8B4A2B",
    "MeatRare": "#D96C6C", "Tripe": "#D8C9B0", "Ball": "#B59A7A", "Onion": "#F3F0E6", "Plastic": "#3BB0A0", "Orange": "#F4A261", "Brown": "#7A4B2A",
    "Glass": "#DDEEF5", "Black": "#1E1E22",
}
_mats = {}
def mat(name, emit=0.0):
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexrgb(PAL[name]); b.inputs["Roughness"].default_value = 0.75
    if emit: b.inputs["Emission Color"].default_value = hexrgb(PAL[name]); b.inputs["Emission Strength"].default_value = emit
    _mats[name] = m; return m

# ---------- helpers ----------
def new_scene(name):
    sc = bpy.data.scenes.get(name)
    if sc: bpy.data.scenes.remove(sc)
    sc = bpy.data.scenes.new(name); bpy.context.window.scene = sc
    sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 960, 720
    ld = bpy.data.lights.new(name + "_Sun", 'SUN'); ld.energy = 3.0; ld.angle = math.radians(10)
    lo = bpy.data.objects.new(name + "_Sun", ld); sc.collection.objects.link(lo); lo.rotation_euler = (math.radians(35), math.radians(15), math.radians(-60))
    w = bpy.data.worlds.new(name + "_World"); w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.8, 0.86, 0.92, 1); w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    sc.world = w; return sc

def finish(ob, m, bevel=0.03, flat=True, smooth=False):
    ob.data.materials.clear(); ob.data.materials.append(mat(m))
    for p in ob.data.polygons: p.use_smooth = smooth
    if bevel:
        bm = ob.modifiers.new("Bevel", 'BEVEL'); bm.width = bevel; bm.segments = 2; bm.limit_method = 'ANGLE'; bm.angle_limit = math.radians(40)
    return ob

def box(name, size, loc, m, parent=None, rot=(0, 0, 0), bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object; ob.name = name; ob.scale = (size[0], size[1], size[2]); ob.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True)
    finish(ob, m, bevel)
    if parent: ob.parent = parent
    return ob

def cyl(name, r, h, loc, m, parent=None, sides=12, r2=None, smooth=False, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc)
    ob = bpy.context.active_object; ob.name = name; ob.rotation_euler = rot
    finish(ob, m, bevel=0, smooth=smooth)
    if parent: ob.parent = parent
    return ob

def sph(name, r, loc, m, parent=None, scale=(1, 1, 1), subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv + 1, radius=r, location=loc)
    ob = bpy.context.active_object; ob.name = name; ob.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    finish(ob, m, bevel=0, smooth=False)
    if parent: ob.parent = parent
    return ob

def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e); e.location = loc; return e

def export(objects, filename, animations=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
        for ch in o.children_recursive: ch.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    path = os.path.join(OUT, filename)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_apply=True, export_yup=True, export_animations=animations, use_active_scene=True)
    return os.path.getsize(path)

# =====================================================================
#  TRẠM BẾP — mỗi trạm là một Empty gốc tên Station_<type>, con là mesh.
#  Kích thước chuẩn: chiếm ô 1 × 1 m (x × y), cao ~0.9 m; three.js scale x/z theo config.
# =====================================================================
def build_stations():
    sc = new_scene("Kitchen"); roots = []
    # --- Kệ (shelf): tủ gỗ + mặt inox + 2 tầng ---
    r = empty("Station_shelf"); roots.append(r)
    box("Shelf_Body", (1.0, 1.0, 0.86), (0, 0, 0.43), "Wood", r)
    box("Shelf_Top", (1.04, 1.04, 0.05), (0, 0, 0.885), "Steel", r, bevel=0.015)
    box("Shelf_Kick", (0.9, 0.9, 0.08), (0, 0, 0.04), "WoodDark", r, bevel=0.01)
    box("Shelf_Rail", (1.0, 0.04, 0.12), (0, -0.5, 0.97), "WoodDark", r, bevel=0.01)   # gờ chắn phía trước (−y)
    # --- Nồi trụng (pot): bàn inox + nồi to + nước + rọ ---
    r = empty("Station_pot"); roots.append(r)
    box("Pot_Table", (1.4, 1.0, 0.84), (0, 0, 0.42), "Steel", r)
    box("Pot_TableTop", (1.44, 1.04, 0.04), (0, 0, 0.86), "SteelDark", r, bevel=0.01)
    cyl("Pot_Body", 0.42, 0.5, (0, 0, 1.13), "Pot", r, sides=14, r2=0.36)
    cyl("Pot_Rim", 0.45, 0.05, (0, 0, 1.38), "SteelDark", r, sides=14)
    cyl("Pot_Water", 0.38, 0.02, (0, 0, 1.36), "Water", r, sides=14)
    for s in (-1, 1): box("Pot_Handle", (0.08, 0.16, 0.06), (s * 0.48, 0, 1.25), "SteelDark", r, bevel=0.01)
    cyl("Pot_Basket", 0.16, 0.22, (0.2, -0.05, 1.45), "SteelDark", r, sides=10, r2=0.12)  # rọ trụng
    box("Pot_BasketHandle", (0.03, 0.03, 0.4), (0.2, -0.05, 1.75), "SteelDark", r, bevel=0)
    # --- Bồn xả lạnh (sink) ---
    r = empty("Station_sink"); roots.append(r)
    box("Sink_Table", (1.2, 1.0, 0.84), (0, 0, 0.42), "Steel", r)
    box("Sink_Top", (1.24, 1.04, 0.06), (0, 0, 0.87), "SteelDark", r, bevel=0.01)
    box("Sink_Basin", (0.8, 0.6, 0.22), (0, 0.05, 0.86), "Water", r, bevel=0.02)
    box("Sink_Faucet", (0.05, 0.05, 0.35), (0, 0.42, 1.05), "SteelDark", r, bevel=0.01)
    box("Sink_Spout", (0.05, 0.3, 0.05), (0, 0.28, 1.22), "SteelDark", r, bevel=0.01)
    # --- Nước lèo (stove): bếp đen + nồi lớn + nắp hé + vá ---
    r = empty("Station_stove"); roots.append(r)
    box("Stove_Body", (1.4, 1.0, 0.7), (0, 0, 0.35), "Black", r)
    box("Stove_Top", (1.44, 1.04, 0.05), (0, 0, 0.72), "SteelDark", r, bevel=0.01)
    cyl("Stove_Burner", 0.56, 0.06, (0, 0, 0.77), "Red", r, sides=16)
    cyl("Stove_Pot", 0.55, 0.75, (0, 0, 1.17), "Steel", r, sides=16, r2=0.5)
    cyl("Stove_Broth", 0.5, 0.03, (0, 0, 1.55), "Broth", r, sides=16)
    # vá múc dựng trong nồi + vài miếng hành nổi
    box("Stove_Ladle", (0.04, 0.04, 0.7), (-0.3, 0.2, 1.85), "SteelDark", r, bevel=0.005, rot=(math.radians(-18), math.radians(12), 0))
    cyl("Stove_LadleCup", 0.09, 0.06, (-0.42, 0.34, 1.53), "SteelDark", r, sides=10, r2=0.07)
    for i, a in enumerate((0.4, 2.0, 3.9, 5.3)): cyl(f"Stove_Onion{i}", 0.06, 0.012, (0.3 * math.cos(a), 0.3 * math.sin(a), 1.57), "Onion", r, sides=8)
    # --- Quầy ráp (counter): gỗ sáng, mặt kính/inox, 2 vòng đặt tô ---
    r = empty("Station_counter"); roots.append(r)
    box("Counter_Body", (1.0, 1.0, 0.86), (0, 0, 0.43), "WoodLight", r)
    box("Counter_Top", (1.04, 1.04, 0.05), (0, 0, 0.885), "Cream", r, bevel=0.015)
    box("Counter_Kick", (0.92, 0.92, 0.08), (0, 0, 0.04), "WoodDark", r, bevel=0.01)
    # --- Quầy giao (serve): quầy màu cam ấm + khay ---
    r = empty("Station_serve"); roots.append(r)
    box("Serve_Body", (1.0, 1.0, 0.95), (0, 0, 0.475), "Broth", r)
    box("Serve_Top", (1.04, 1.04, 0.05), (0, 0, 0.975), "WoodDark", r, bevel=0.015)
    box("Serve_Stripe", (1.02, 0.02, 0.18), (0, 0.51, 0.55), "Cream", r, bevel=0.005)
    # --- Ghế nhựa + bàn ---
    r = empty("Station_seat"); roots.append(r)
    box("Seat_Top", (0.42, 0.42, 0.06), (0, 0, 0.43), "Plastic", r, bevel=0.02)
    for sx in (-1, 1):
        for sy in (-1, 1): box("Seat_Leg", (0.05, 0.05, 0.42), (sx * 0.17, sy * 0.17, 0.21), "Plastic", r, bevel=0.01)
    box("Table_Top", (0.9, 0.6, 0.05), (0, -0.62, 0.78), "Steel", r, bevel=0.01)
    box("Table_Leg", (0.06, 0.06, 0.76), (0, -0.62, 0.38), "SteelDark", r, bevel=0.005)
    box("Table_Foot", (0.5, 0.35, 0.03), (0, -0.62, 0.015), "SteelDark", r, bevel=0.005)
    # --- Thùng rác ---
    r = empty("Station_trash"); roots.append(r)
    cyl("Trash_Bin", 0.3, 0.75, (0, 0, 0.375), "GreenDark", r, sides=10, r2=0.26)
    cyl("Trash_Lid", 0.33, 0.06, (0, 0, 0.78), "Green", r, sides=10)
    box("Trash_Handle", (0.14, 0.04, 0.05), (0, 0, 0.83), "Ink", r, bevel=0.005)
    # --- Tường sau + gạch + biển hiệu ---
    r = empty("Station_wall"); roots.append(r)
    box("Wall_Panel", (1.0, 0.12, 2.4), (0, 0, 1.2), "Cream", r, bevel=0.01)
    box("Wall_Tile", (1.0, 0.03, 1.1), (0, -0.07, 0.55), "Teal", r, bevel=0.005)
    box("Wall_TileLine", (1.0, 0.035, 0.03), (0, -0.075, 1.12), "TealDark", r, bevel=0)
    # --- Sàn (1 ô gạch) ---
    r = empty("Station_floor"); roots.append(r)
    box("Floor_Tile", (0.96, 0.96, 0.04), (0, 0, -0.02), "WoodLight", r, bevel=0.01)
    box("Floor_Grout", (1.0, 1.0, 0.03), (0, 0, -0.03), "WoodDark", r, bevel=0)
    size = export(roots, "kitchen.glb")   # tất cả gốc ở (0,0,0); preview xếp hàng sau khi export
    return sc, roots, size

# =====================================================================
#  ĐẦU BẾP (chibi) — gốc tại chân, mặt +Y(Blender) = -Z glTF... ta quy ước mặt về −Y để thành +Z trong glTF
# =====================================================================
def build_chef():
    sc = new_scene("Chef"); r = empty("Chef"); r["forward"] = "+Z"
    body = empty("Chef_Body"); body.parent = r; body.location = (0, 0, 0)
    box("Chef_Torso", (0.5, 0.38, 0.5), (0, 0, 0.72), "White", body)
    box("Chef_Apron", (0.44, 0.06, 0.42), (0, -0.2, 0.62), "Red", body, bevel=0.02)
    box("Chef_ApronStrap", (0.36, 0.06, 0.05), (0, -0.2, 0.86), "Red", body, bevel=0.01)
    box("Chef_Belt", (0.52, 0.4, 0.06), (0, 0, 0.47), "Ink", body, bevel=0.01)
    for s, nm in ((-1, "L"), (1, "R")):
        box(f"Chef_Leg{nm}", (0.18, 0.2, 0.44), (s * 0.12, 0, 0.22), "Ink", body, bevel=0.02)
        box(f"Chef_Shoe{nm}", (0.2, 0.3, 0.1), (s * 0.12, -0.04, 0.05), "Brown", body, bevel=0.02)
        arm = empty(f"Chef_Arm{nm}", (s * 0.33, 0, 0.9)); arm.parent = body
        box(f"Chef_UpperArm{nm}", (0.14, 0.14, 0.3), (0, 0, -0.15), "White", arm, bevel=0.02)
        box(f"Chef_Hand{nm}", (0.15, 0.15, 0.14), (0, -0.05, -0.36), "Skin", arm, bevel=0.03)
    head = empty("Chef_Head", (0, 0, 1.05)); head.parent = body
    sph("Chef_Skull", 0.3, (0, 0, 0.26), "Skin", head, scale=(1, 0.95, 1))
    sph("Chef_Nose", 0.05, (0, -0.28, 0.2), "Skin", head)
    for s in (-1, 1): sph("Chef_Eye", 0.035, (s * 0.1, -0.26, 0.28), "Ink", head)
    box("Chef_Mouth", (0.1, 0.02, 0.02), (0, -0.28, 0.12), "Red", head, bevel=0)
    cyl("Chef_Hat", 0.26, 0.3, (0, 0, 0.6), "White", head, sides=14, r2=0.3)
    cyl("Chef_HatBand", 0.28, 0.06, (0, 0, 0.47), "Red", head, sides=14)
    hand = empty("Chef_Carry", (0, -0.42, 0.85)); hand.parent = body   # điểm gắn đồ cầm trên tay
    size = export([r], "chef.glb")
    return sc, r, size

# =====================================================================
#  KHÁCH — 3 biến thể, ngồi, gốc tại chân ghế
# =====================================================================
def build_customers():
    sc = new_scene("Customers"); roots = []
    variants = [
        ("Customer_office", "Teal", "Hair", "bun"),
        ("Customer_xeom", "Brown", "Ink", "cap"),
        ("Customer_tourist", "Orange", "Broth", "hat"),
    ]
    for i, (name, shirt, hair, head_style) in enumerate(variants):
        r = empty(name); roots.append(r)
        box(f"{name}_Torso", (0.46, 0.34, 0.46), (0, 0, 0.72), shirt, r)
        for s in (-1, 1):
            box(f"{name}_Thigh", (0.17, 0.4, 0.16), (s * 0.12, -0.2, 0.5), "Ink" if i != 2 else "Cream", r, bevel=0.02)
            box(f"{name}_Shin", (0.15, 0.15, 0.4), (s * 0.12, -0.38, 0.22), "Ink" if i != 2 else "Cream", r, bevel=0.02)
            box(f"{name}_Shoe", (0.17, 0.26, 0.09), (s * 0.12, -0.42, 0.045), "Brown", r, bevel=0.02)
            box(f"{name}_Arm", (0.13, 0.13, 0.36), (s * 0.31, -0.02, 0.76), shirt, r, bevel=0.02, rot=(math.radians(-25), 0, 0))
            box(f"{name}_Hand", (0.13, 0.13, 0.12), (s * 0.31, -0.2, 0.58), "Skin", r, bevel=0.03)
        head = empty(f"{name}_Head", (0, 0, 1.0)); head.parent = r
        sph(f"{name}_Skull", 0.28, (0, 0, 0.26), "Skin", head, scale=(1, 0.95, 1))
        for s in (-1, 1): sph(f"{name}_Eye", 0.033, (s * 0.1, -0.25, 0.28), "Ink", head)
        box(f"{name}_Mouth", (0.09, 0.02, 0.02), (0, -0.27, 0.13), "Red", head, bevel=0)
        if head_style == "bun":
            sph(f"{name}_HairCap", 0.29, (0, 0.02, 0.32), hair, head, scale=(1, 1, 0.7))
            sph(f"{name}_HairBun", 0.11, (0, 0.2, 0.5), hair, head)
        elif head_style == "cap":
            sph(f"{name}_HairCap", 0.285, (0, 0.02, 0.3), hair, head, scale=(1, 1, 0.6))
            cyl(f"{name}_Cap", 0.3, 0.12, (0, 0, 0.5), "GreenDark", head, sides=12, r2=0.26)
            box(f"{name}_CapBrim", (0.3, 0.22, 0.03), (0, -0.3, 0.46), "GreenDark", head, bevel=0.005)
        else:
            sph(f"{name}_HairCap", 0.285, (0, 0.02, 0.3), "Brown", head, scale=(1, 1, 0.6))
            cyl(f"{name}_Hat", 0.42, 0.03, (0, 0, 0.5), hair, head, sides=14)
            cyl(f"{name}_HatTop", 0.24, 0.16, (0, 0, 0.58), hair, head, sides=14, r2=0.22)
            box(f"{name}_Backpack", (0.34, 0.16, 0.36), (0, 0.24, 0.74), "Red", r, bevel=0.03)
    size = export(roots, "customers.glb")
    return sc, roots, size

# =====================================================================
#  NGUYÊN LIỆU + TÔ — mỗi item là một Empty tên Item_<id>, kích thước ~0.25 m để đặt lên kệ / cầm tay.
#  Lớp ráp: Bowl_layer_<token> đặt trên tô chuẩn Bowl_base.
# =====================================================================
def build_items():
    sc = new_scene("Items"); roots = []
    def item(name):
        r = empty("Item_" + name); roots.append(r); return r
    # sợi
    r = item("pho-noodle");  cyl("N1", 0.13, 0.12, (0, 0, 0.06), "Noodle", r, sides=10, r2=0.11); box("N1b", (0.12, 0.12, 0.05), (0, 0, 0.14), "Cream", r, bevel=0.01)
    r = item("bun");         cyl("N2", 0.12, 0.1, (0, 0, 0.05), "White", r, sides=10, r2=0.1)
    r = item("bun-to");      cyl("N3", 0.13, 0.14, (0, 0, 0.07), "White", r, sides=10, r2=0.12)
    # tô
    for nm, rim in (("pho-bowl", "Teal"), ("soup-bowl", "Red")):
        r = item(nm); cyl("B", 0.17, 0.12, (0, 0, 0.06), "White", r, sides=14, r2=0.1); cyl("Br", 0.175, 0.02, (0, 0, 0.125), rim, r, sides=14)
    # thịt
    r = item("nam");   [box(f"M{i}", (0.16, 0.1, 0.025), (0, i * 0.03 - 0.03, 0.02 + i * 0.02), "Meat", r, bevel=0.005) for i in range(3)]
    r = item("bo-tai"); [box(f"T{i}", (0.15, 0.1, 0.02), (0, i * 0.03 - 0.03, 0.02 + i * 0.018), "MeatRare", r, bevel=0.005) for i in range(3)]
    r = item("la-sach"); box("LS", (0.18, 0.12, 0.05), (0, 0, 0.03), "Tripe", r, bevel=0.015); box("LS2", (0.14, 0.08, 0.05), (0.02, 0.02, 0.07), "Tripe", r, bevel=0.015)
    r = item("bo-vien"); [sph(f"BV{i}", 0.05, p, "Ball", r) for i, p in enumerate(((-0.06, 0, 0.05), (0.06, 0, 0.05), (0, 0.05, 0.12)))]
    # rau
    r = item("hanh-tay"); [cyl(f"O{i}", 0.07, 0.015, (i * 0.04 - 0.04, 0, 0.02 + i * 0.015), "Onion", r, sides=10) for i in range(3)]
    r = item("ngo-ri-ngo-gai"); [sph(f"H{i}", 0.06, p, "Green", r, scale=(1, 1, 0.5)) for i, p in enumerate(((-0.05, 0, 0.04), (0.05, 0.02, 0.05), (0, -0.05, 0.07)))]
    r = item("hanh-la"); [box(f"S{i}", (0.03, 0.2, 0.03), (i * 0.04 - 0.04, 0, 0.02), "GreenDark", r, bevel=0.005, rot=(0, 0, math.radians(i * 12 - 12))) for i in range(3)]
    # nước lèo: vá múc
    r = item("broth"); cyl("Ladle", 0.09, 0.06, (0, 0, 0.03), "SteelDark", r, sides=10, r2=0.07); cyl("LadleB", 0.08, 0.02, (0, 0, 0.06), "Broth", r, sides=10); box("LadleH", (0.025, 0.025, 0.3), (0, 0.1, 0.15), "SteelDark", r, bevel=0, rot=(math.radians(-30), 0, 0))
    # token sợi các trạng thái (cùng hình, khác màu) + tô đã trụng
    r = item("noodle-blanched"); cyl("NB", 0.13, 0.12, (0, 0, 0.06), "Noodle", r, sides=10, r2=0.11); cyl("NBs", 0.1, 0.02, (0, 0, 0.13), "White", r, sides=10)
    r = item("noodle-rinsed");   cyl("NR", 0.13, 0.12, (0, 0, 0.06), "Water", r, sides=10, r2=0.11)
    r = item("noodle-drained");  cyl("ND", 0.13, 0.11, (0, 0, 0.055), "Noodle", r, sides=10, r2=0.11)
    r = item("bowl-hot"); cyl("BH", 0.17, 0.12, (0, 0, 0.06), "White", r, sides=14, r2=0.1); cyl("BHr", 0.175, 0.02, (0, 0, 0.125), "Teal", r, sides=14)
    # --- tô ráp: base + các lớp ---
    r = empty("Bowl_base"); roots.append(r)
    cyl("Bowl", 0.3, 0.2, (0, 0, 0.1), "White", r, sides=16, r2=0.18); cyl("BowlRim", 0.31, 0.03, (0, 0, 0.21), "Teal", r, sides=16)
    cyl("BowlFoot", 0.16, 0.03, (0, 0, 0.015), "Cream", r, sides=16)
    layers = {
        "noodle-drained": lambda r: cyl("L", 0.25, 0.06, (0, 0, 0.19), "Noodle", r, sides=16),
        "nam": lambda r: [box(f"L{i}", (0.16, 0.09, 0.02), (0.08, i * 0.06 - 0.06, 0.23), "Meat", r, bevel=0.005) for i in range(3)],
        "bo-tai": lambda r: [box(f"L{i}", (0.14, 0.09, 0.02), (-0.09, i * 0.06 - 0.06, 0.235), "MeatRare", r, bevel=0.005, rot=(0, 0, 0.3)) for i in range(3)],
        "la-sach": lambda r: box("L", (0.14, 0.1, 0.03), (0, 0.12, 0.24), "Tripe", r, bevel=0.01),
        "bo-vien-ready": lambda r: [sph(f"L{i}", 0.05, (0.12 * math.cos(a), 0.12 * math.sin(a), 0.26), "Ball", r) for i, a in enumerate((0.5, 2.6, 4.7))],
        "hanh-tay": lambda r: [cyl(f"L{i}", 0.05, 0.012, (0.05 * math.cos(a), 0.05 * math.sin(a), 0.26), "Onion", r, sides=8) for i, a in enumerate((0.3, 2.4, 4.4))],
        "ngo-ri-ngo-gai": lambda r: [sph(f"L{i}", 0.045, (0.1 * math.cos(a), 0.1 * math.sin(a), 0.275), "Green", r, scale=(1, 1, 0.5)) for i, a in enumerate((1.0, 3.1, 5.2))],
        "hanh-la": lambda r: [box(f"L{i}", (0.02, 0.1, 0.02), (0.06 * math.cos(a), 0.06 * math.sin(a), 0.285), "GreenDark", r, bevel=0, rot=(0, 0, a)) for i, a in enumerate((0.8, 2.9, 5.0))],
        "broth": lambda r: cyl("L", 0.28, 0.02, (0, 0, 0.2), "Broth", r, sides=16),
    }
    for tok, fn in layers.items():
        r = empty("Bowl_layer_" + tok); roots.append(r); fn(r)
    size = export(roots, "items.glb")
    return sc, roots, size

if __name__ == "__main__" or True:
    results = {}
    # dọn dữ liệu của lần chạy trước để tên object không bị thêm .001
    for scn in ["Kitchen", "Chef", "Customers", "Items"]:
        sc_old = bpy.data.scenes.get(scn)
        if sc_old:
            for o in list(sc_old.objects): bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.worlds):
        for x in list(coll):
            if x.users == 0: coll.remove(x)
    _mats.clear()
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    sc1, roots1, results["kitchen.glb"] = build_stations()
    sc2, chef, results["chef.glb"] = build_chef()
    sc3, custs, results["customers.glb"] = build_customers()
    sc4, items, results["items.glb"] = build_items()
    RESULT = results
