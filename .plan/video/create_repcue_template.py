import bpy
import math

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Scene/world settings
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.frame_rate = 30

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.1, 0.1, 0.1, 1.0)
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
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj
cam_obj.location = (0.0, -4.2, 1.5)  # Standing default
cam_obj.rotation_euler = (math.radians(80), 0, 0)

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

# Output defaults
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'LOW'
scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
scene.render.ffmpeg.gopsize = scene.frame_rate

print("Template scene created. Save as repcue_template.blend")
