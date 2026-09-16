
import bpy, json, sys, os
R = r"F:\AntiGravity\Games\quan-bun"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(R, "public", "models", "kitchen.glb"))
out = {}
for ob in bpy.data.objects:
    if ob.type != "MESH":
        continue
    ws = [ob.matrix_world @ v for v in [__import__("mathutils").Vector(c) for c in ob.bound_box]]
    xs = [v.x for v in ws]; ys = [v.y for v in ws]; zs = [v.z for v in ws]
    out[ob.name] = [round(min(xs),2), round(min(ys),2), round(min(zs),2),
                    round(max(xs),2), round(max(ys),2), round(max(zs),2)]
roots = {ob.name: [c.name for c in ob.children] for ob in bpy.data.objects if ob.name.startswith("Station")}
mats = sorted({m.name for m in bpy.data.materials})
open(os.path.join(R, "art", "npr", "_probe.json"), "w").write(json.dumps({"bbox": out, "roots": roots, "mats": mats}, indent=0))
