#!/usr/bin/python3

from PIL import Image, ImageDraw

def test_rgba():
    pixels = []

    for y in range(256):
        for x in range(256):
            r = (x % 16) * 15
            g = (y % 16) * 15
            b = y
            a = x

            pixels.append((r, g, b, a))

    img = Image.new('RGBA', (256, 256))
    img.putdata(pixels)
    img.save('assets/test.png')

def mirrorL(img):
    w2 = int(img.width / 2)
    crop = img.crop((0, 0, w2, img.height))
    flip = crop.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    img.paste(flip, (w2, 0))

def bottom_image():
    img2 = Image.new('RGBA', (160, 20), "#8080EE")
    draw = ImageDraw.Draw(img2)
    draw.ellipse((70, -10, 90, 18), fill=(0, 0, 0, 0))
    img2.save('assets/bottom.png')

    img3 = img2.resize((60, 10), resample=Image.Resampling.LANCZOS)
    img3.save('assets/half.png')

def egg_image():
    img = Image.new('RGBA', (20, 25), "#00000000")
    draw = ImageDraw.Draw(img)
    draw.ellipse((0,0, 19,24), fill='#FFFFFFFF')
    img.save("assets/egg.png")

def gun_image():
    img = Image.new('RGBA', (80, 30), "#00000000")
    draw = ImageDraw.Draw(img)
    draw.polygon((0,29, 15,9, 35,9, 39,0, 39,29), fill='#777777FF')
    mirrorL(img)
    img.save("assets/gun.png")

def grabber_image():
    img = Image.new('RGBA', (100, 120), "#00000000")
    draw = ImageDraw.Draw(img)
    draw.polygon((49,90, 43,90, 30,100, 35,119, 31,119, 20,98, 49,98), fill='#F0F0F0')
    draw.ellipse((31,58, 68,95), fill='#9020A0')
    draw.polygon((49,80, 30,80, 23,50, 0,40, 49,40), fill='#BBFF77')
    draw.chord((-50,0, 150,240), start=240, end=300, fill="#2277EE")
    mirrorL(img)
    img.save("assets/grabber.png")


bottom_image()
egg_image()
gun_image()
grabber_image()