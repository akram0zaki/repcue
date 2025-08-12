
# blender_batch_render.py
# Usage (in Terminal):
#   blender -b -P blender_batch_render.py -- \
#     --src /path/to/fbx_glb \
#     --out /path/to/output \
#     --ids squats push-ups lunges ... \
#     --fps 30 --seconds 3
#
# Expects one FBX/GLB per exercise id in --src, named <id>.fbx or <id>.glb
# For static poses (e.g., plank), you can also provide a .blend with an Action named 'Loop'
#
import bpy, sys, os, math, argparse

# ---------------- CLI ----------------
argv = sys.argv
argv = argv[argv.index("--")+1:] if "--" in argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--src", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--ids", nargs="+", required=True)
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--seconds", type=float, default=2.0)  # per-loop duration for rep clips
ap.add_argument("--static_seconds", type=float, default=10.0)
ap.add_argument("--format", choices=["FFMPEG","PNG"], default="FFMPEG")
args = ap.parse_args(argv)

os.makedirs(args.out, exist_ok=True)

# ---------------- Scene setup ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 32
scene.eevee.use_bloom = False
scene.eevee.use_gtao = True
scene.eevee.use_ssr = False
scene.frame_rate = args.fps

# World
world = bpy.data.worlds.new("World")
bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.1,0.1,0.1,1.0)  # dark gray
bg.inputs[1].default_value = 1.0

# Ground
bpy.ops.mesh.primitive_plane_add(size=20, location=(0,0,0))
ground = bpy.context.active_object
ground.name = "Ground"
mat = bpy.data.materials.new("GroundMat")
mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.12,0.12,0.12,1.0)
ground.data.materials.append(mat)

# Camera
cam = bpy.data.cameras.new("Camera")
cam.lens = 50
cam_obj = bpy.data.objects.new("Camera", cam)
bpy.context.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

def position_camera(kind="standing", aspect="square"):
    if kind == "floor":
        cam_obj.location = (0.0, -3.2, 1.0)
    else:
        cam_obj.location = (0.0, -4.2, 1.5)
    cam_obj.rotation_euler = (math.radians(90-10), 0, 0)  # slight down-tilt
    # Aspect-specific resolution
    if aspect == "square":
        bpy.context.scene.render.resolution_x = 1080
        bpy.context.scene.render.resolution_y = 1080
    elif aspect == "portrait":
        bpy.context.scene.render.resolution_x = 1080
        bpy.context.scene.render.resolution_y = 1920
    else:
        bpy.context.scene.render.resolution_x = 1920
        bpy.context.scene.render.resolution_y = 1080

# Lights
def add_area(name, loc, rot, power=1200, size=5):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot)
    L = bpy.context.active_object
    L.name = name
    L.data.energy = power
    L.data.shape = 'RECTANGLE'
    L.data.size = size
    L.data.size_y = size
    return L

add_area("Key", (3,-3,3), (math.radians(-35),0,math.radians(35)), power=1500, size=5)
add_area("Fill", (-3,-3,2.5), (math.radians(-25),0,math.radians(-35)), power=800, size=5)
add_area("Rim", (0,3,2.5), (math.radians(-160),0,0), power=600, size=3)

# Render settings
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'LOW'
scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
scene.render.ffmpeg.gopsize = args.fps
scene.render.use_sequencer = False

def import_asset(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
    elif ext == ".glb" or ext == ".gltf":
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".blend":
        # Append action/collection
        with bpy.data.libraries.load(path, link=False) as (data_from, data_to):
            data_to.collections = [name for name in data_from.collections if name == "Collection"]
        for col in data_to.collections:
            bpy.context.scene.collection.children.link(col)
    else:
        raise RuntimeError(f"Unsupported file: {path}")
    # Assume last imported armature is our character
    rigs = [obj for obj in bpy.context.selected_objects if obj.type == 'ARMATURE']
    return rigs[0] if rigs else None

def find_action(obj):
    # Use first action on the armature or NLA
    if obj and obj.animation_data:
        ad = obj.animation_data
        if ad.action: return ad.action
        if ad.nla_tracks and ad.nla_tracks[0].strips:
            return ad.nla_tracks[0].strips[0].action
    return None

# Determine if floor move based on id heuristic
FLOOR_IDS = {"plank","side-plank","mountain-climbers","bicycle-crunches","dead-bug",
             "glute-bridges","tricep-dips","downward-dog","child-pose","cat-cow","bear-crawl","forward-fold"}

for ex_id in args.ids:
    # Load scene fresh per id
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = world
    bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    bpy.context.scene.frame_rate = args.fps
    # Re-add ground/lights/camera
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0,0,0))
    ground = bpy.context.active_object
    ground.name = "Ground"
    ground.data.materials.append(mat)
    add_area("Key", (3,-3,3), (math.radians(-35),0,math.radians(35)), power=1500, size=5)
    add_area("Fill", (-3,-3,2.5), (math.radians(-25),0,math.radians(-35)), power=800, size=5)
    add_area("Rim", (0,3,2.5), (math.radians(-160),0,0), power=600, size=3)
    cam = bpy.data.cameras.new("Camera")
    cam.lens = 50
    cam_obj = bpy.data.objects.new("Camera", cam)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    # Import
    src_base = os.path.join(args.src, ex_id)
    fpath = None
    for ext in (".fbx",".glb",".gltf",".blend"):
        cand = src_base + ext
        if os.path.exists(cand):
            fpath = cand; break
    if not fpath:
        print(f"[WARN] Missing asset for {ex_id} in {args.src}")
        continue
    rig = import_asset(fpath)
    if rig:
        bpy.context.view_layer.objects.active = rig

    # Determine duration
    is_static = ex_id in {"plank","side-plank","wall-sit","downward-dog","child-pose",
                          "single-leg-stand","tree-pose","warrior-3","forward-fold","finger-roll"}
    seconds = args.static_seconds if is_static else args.seconds
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = int(seconds * args.fps)

    # Looping: if action exists, scale to fit seconds
    act = find_action(rig)
    if act:
        # Normalize action to scene frame range
        fstart, fend = act.frame_range
        orig = (fend - fstart) if fend > fstart else 1.0
        scale = (scene.frame_end - scene.frame_start + 1) / orig
        for fcurve in act.fcurves:
            for kp in fcurve.keyframe_points:
                kp.co.x = (kp.co.x - fstart) * scale + scene.frame_start
                kp.handle_left.x = (kp.handle_left.x - fstart) * scale + scene.frame_start
                kp.handle_right.x = (kp.handle_right.x - fstart) * scale + scene.frame_start
        # Seamless: add 2-frame crossfade with NLA (optional advanced)
    else:
        # Static: add tiny sway by keying root rotation Z
        if rig:
            bone = rig.pose.bones[0] if rig.pose.bones else None
            obj = rig
            obj.animation_data_create()
            act = bpy.data.actions.new(f"{ex_id}_Idle")
            obj.animation_data.action = act
            fcu = act.fcurves.new(data_path="rotation_euler", index=2)
            fcu.keyframe_points.add(2)
            fcu.keyframe_points[0].co = (scene.frame_start, 0.0)
            fcu.keyframe_points[1].co = (scene.frame_end, 0.05)  # ~3°
            fcu.update()

    # Render 3 aspects
    for aspect in ("square","portrait","landscape"):
        kind = "floor" if ex_id in FLOOD_IDS if False else ("floor" if ex_id in FLOOD_IDS else ("floor" if ex_id in FLOOD_IDS else ("floor" if ex_id in set() else ("floor" if ex_id in set() else None))))
        # Simpler: decide floor by set membership
        kind = "floor" if ex_id in {"plank","side-plank","mountain-climbers","bicycle-crunches","dead-bug","glute-bridges","tricep-dips","downward-dog","child-pose","cat-cow","bear-crawl","forward-fold"} else "standing"
        position_camera(kind=kind, aspect=aspect)
        out_dir = os.path.join(args.out, ex_id)
        os.makedirs(out_dir, exist_ok=True)
        scene.render.filepath = os.path.join(out_dir, f"{ex_id}_v1_" + ("1080x1080" if aspect=="square" else "1080x1920" if aspect=="portrait" else "1920x1080") + ".mp4")
        bpy.ops.render.render(animation=True)
print("Done.")
