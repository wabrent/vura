#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FOMO SKULL — генератор NFT-коллекции
=====================================
Процедурная генерация NFT-коллекции из 2000 уникальных пиксель-арт изображений
(1000x1000 px) по строгой пиксельной сетке референса + метаданные ERC-721 / OpenSea.

Архитектура графики:
  * Логическая сетка 50x50 клеток, каждая клетка = 20x20 px -> 1000x1000.
  * Силуэт черепа задан матрицей 20x18 (референс) и масштабируется x2 (NEAREST).
  * В лицевой части вырезан силуэт логотипа FOMO (два скругленных соединенных
    звена) — сквозь вырез виден цвет акцента (глаз/заливка).
  * Внизу по центру — номер токена "#0001".."#2000" собственным пиксельным
    моноширинным шрифтом 5x7.
  * Тонкая контрастная обводка силуэта + едва заметная сетка по клеткам.

Установка:
    pip install pillow

Запуск (полная коллекция 2000 штук):
    python scripts/generate_nft.py

Другие варианты:
    python scripts/generate_nft.py --count 100 --out output --seed 42
    python scripts/generate_nft.py --count 2000 --name-prefix "My Skull"

Структура вывода:
    output/
      images/0001.png ... 2000.png      (PNG, nearest neighbor, без сглаживания)
      metadata/0001.json ... 2000.json  (ERC-721: name, description, image, attributes)

После заливки на IPFS замените "image" в JSON на ipfs://<CID>/0001.png и т.д.
"""

import argparse
import hashlib
import json
import os
import random
import sys
import time

from PIL import Image, ImageChops, ImageDraw, ImageFilter

# ============================================================
# БАЗОВАЯ ГЕОМЕТРИЯ
# ============================================================
GRID = 50               # логическая сетка 50x50
CELL = 20               # пикселей на клетку
SIZE = GRID * CELL      # итоговый холст 1000x1000
SCALE = 2               # масштаб матрицы черепа (20x18 -> 40x36 клеток)

# Позиция черепа на сетке (центрируем: 40x36 в 50x50)
SKULL_X0 = (GRID - 20 * SCALE) // 2   # 5
SKULL_Y0 = 4

# Позиция подписи "#XXXX": шрифт 5x7, 5 символов + 4 пробела = 29 клеток
TEXT_Y0 = 42

# ============================================================
# СИЛУЭТ ЧЕРЕПА — матрица 20x18 (1 = кость, 0 = пусто/фон)
# Округлый череп сверху, сужение к челюсти, снизу 4 вертикальных
# зуба с пробелами (пробела: колонки 6, 9-10, 13).
# ============================================================
SKULL_MATRIX = [
    "00000001111110000000",  # 0  макушка
    "00001111111111100000",  # 1
    "00011111111111111000",  # 2
    "00111111111111111110",  # 3
    "01111111111111111111",  # 4
    "01111111111111111111",  # 5  лицо (здесь будет вырез FOMO)
    "01111111111111111111",  # 6
    "01111111111111111111",  # 7
    "01111111111111111111",  # 8
    "01111111111111111111",  # 9
    "00111111000011111100",  # 10 нос (прорезь)
    "00011111111111111000",  # 11 сужение
    "00001111111111110000",  # 12
    "00000111111111100000",  # 13 щека (пинч)
    "00001111111111110000",  # 14 челюсть (flare)
    "00001101100110110000",  # 15 зубы: 4 зуба с пробелами
    "00001101100110110000",  # 16
    "00001101100110110000",  # 17
]

# ============================================================
# ЛОГОТИП FOMO — матрица 16x8: два скругленных звена,
# соединенных перемычкой по центру (символ-бесконечность).
# Накладывается на лицо черепа (строки 5..12, колонки 2..17).
# ============================================================
FOMO_LOGO = [
    ".#####....#####.",
    "#.....#..#.....#",
    "#.....#..#.....#",
    "#.....####.....#",
    "#.....####.....#",
    "#.....#..#.....#",
    "#.....#..#.....#",
    ".#####....#####.",
]

LOGO_MATRIX_ROW = 5   # верхняя строка логотипа в матрице черепа
LOGO_MATRIX_COL = 2   # левая колонка логотипа в матрице черепа

# ============================================================
# ПИКСЕЛЬНЫЙ ШРИФТ 5x7 (моноширинный) — только символы "#0123456789"
# ============================================================
PIXEL_FONT = {
    "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
    "0": ["#####", "#...#", "#..##", "#.#.#", "##..#", "#...#", "#####"],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": ["#####", "....#", "....#", "#####", "#....", "#....", "#####"],
    "3": ["#####", "....#", "....#", "#####", "....#", "....#", "#####"],
    "4": ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"],
    "5": ["#####", "#....", "#....", "#####", "....#", "....#", "#####"],
    "6": ["#####", "#....", "#....", "#####", "#...#", "#...#", "#####"],
    "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
    "8": ["#####", "#...#", "#...#", "#####", "#...#", "#...#", "#####"],
    "9": ["#####", "#...#", "#...#", "#####", "....#", "....#", "#####"],
}

# ============================================================
# МАТРИЦА ТРЕЙТОВ И ВЕСА РЕДКОСТИ
# (базовые ~70%, редкие ~20%, легендарные ~10%)
# ============================================================
TRAITS = {
    "Background": [
        ("Black", 35),         # базовый  #0a0b10
        ("Dark Navy", 35),     # базовый  #0d1117
        ("Deep Purple", 20),   # редкий
        ("Cyber Slate", 10),   # легендарный
    ],
    "Skull Bones": [
        ("White", 35),           # базовый  #FFFFFF
        ("Off-white", 35),       # базовый
        ("Light Gray", 15),      # редкий
        ("Chrome/Silver", 10),   # редкий / металлик
        ("Cyberpunk Green", 5),  # легендарный
    ],
    "Logo Accent": [
        ("Brand Yellow", 25),   # базовый  #FFD23F
        ("Neon Cyan", 25),      # базовый  #00F0FF
        ("Magenta", 15),        # базовый  #FF007A
        ("Toxic Green", 15),    # базовый  #39FF14
        ("Gold", 12),           # редкий
        ("Dark Invert", 8),     # легендарный (тёмный вырез)
    ],
    "Teeth": [
        ("Classic White", 55),  # базовый
        ("Dark", 20),           # базовый
        ("Neon", 15),           # редкий
        ("Gold Tooth", 10),     # легендарный (1 золотой пиксель)
    ],
}

VARIANTS = 8  # подварианты генерации (паттерн фона + позиция золотого зуба)

# ============================================================
# ЦВЕТА
# ============================================================
BG_COLORS = {
    "Black":       (10, 11, 16),    # #0a0b10
    "Dark Navy":   (13, 17, 23),    # #0d1117
    "Deep Purple": (26, 12, 40),    # #1a0c28
    "Cyber Slate": (22, 32, 43),    # #16202b
}

BONE_COLORS = {
    "White":            (255, 255, 255),
    "Off-white":        (240, 237, 228),
    "Light Gray":       (196, 199, 205),
    "Cyberpunk Green":  (0, 255, 102),
    # Chrome/Silver считается процедурно (градиент по высоте)
}

ACCENT_COLORS = {
    "Brand Yellow": (255, 210, 63),   # #FFD23F
    "Neon Cyan":    (0, 240, 255),    # #00F0FF
    "Magenta":      (255, 0, 122),    # #FF007A
    "Toxic Green":  (57, 255, 20),    # #39FF14
    "Gold":         (255, 184, 0),    # #ffb800
    "Dark Invert":  (16, 16, 22),     # тёмный вырез
}

TEETH_COLORS = {
    "Classic White": (255, 255, 255),
    "Dark":          (20, 20, 26),
    "Neon":          (57, 255, 20),
    "Gold Tooth":    (255, 184, 0),
}

OUTLINE_COLOR = (4, 4, 10, 255)      # контрастная обводка вокруг черепа
GRID_LINE_COLOR = (0, 0, 0, 26)      # тонкая сетка поверх всего
TEXT_COLOR = (255, 255, 255, 255)    # цвет номера токена
TEXT_SHADOW = (10, 11, 16, 255)      # тень подписи

EXTERNAL_URL = "https://vura.ink"


# ============================================================
# ПРОВЕРКИ МАТРИЦ (падаем сразу, если в матрицах опечатка)
# ============================================================
def validate_matrices():
    assert len(SKULL_MATRIX) == 18, "SKULL_MATRIX: ожидается 18 строк"
    for i, row in enumerate(SKULL_MATRIX):
        assert len(row) == 20, "SKULL_MATRIX[%d]: длина %d, ожидается 20" % (i, len(row))
        assert set(row) <= {"0", "1"}, "SKULL_MATRIX[%d]: недопустимые символы" % i
    assert len(FOMO_LOGO) == 8, "FOMO_LOGO: ожидается 8 строк"
    for i, row in enumerate(FOMO_LOGO):
        assert len(row) == 16, "FOMO_LOGO[%d]: длина %d, ожидается 16" % (i, len(row))
        assert set(row) <= {".", "#"}, "FOMO_LOGO[%d]: недопустимые символы" % i


# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================
def weighted_pick(rng, options):
    """Взвешенный выбор: options = [(value, weight), ...]"""
    values, weights = zip(*options)
    return rng.choices(values, weights=weights, k=1)[0]


def sample_traits(rng):
    """Случайный набор трейтов по матрице редкости."""
    return {
        "Background": weighted_pick(rng, TRAITS["Background"]),
        "Skull Bones": weighted_pick(rng, TRAITS["Skull Bones"]),
        "Logo Accent": weighted_pick(rng, TRAITS["Logo Accent"]),
        "Teeth": weighted_pick(rng, TRAITS["Teeth"]),
        "Variant": rng.randrange(VARIANTS),
    }


def dna_of(traits):
    """DNA набора трейтов — строка для проверки уникальности."""
    return "|".join([
        traits["Background"],
        traits["Skull Bones"],
        traits["Logo Accent"],
        traits["Teeth"],
        "V%d" % traits["Variant"],
    ])


def dna_hash(dna):
    return hashlib.sha256(dna.encode("utf-8")).hexdigest()


def chrome_color(gy):
    """Хром/серебро: металлический градиент по высоте клетки."""
    t = (gy - SKULL_Y0) / float(18 * SCALE)          # 0..1 по высоте черепа
    t = max(0.0, min(1.0, t))
    v = 150 + int(105 * (1 - abs(2 * t - 1)))        # тёмные края -> светлый блик
    return (v, v, min(255, v + 6))


def bone_color(bones_trait, gy):
    if bones_trait == "Chrome/Silver":
        return chrome_color(gy)
    return BONE_COLORS[bones_trait]


# ============================================================
# СЛОЙ ЧЕРЕПА (50x50 RGBA) — маска, кость, вырез FOMO, зубы, номер
# ============================================================
def build_skull_layer(traits, token_id, rng):
    img = Image.new("RGBA", (GRID, GRID), (0, 0, 0, 0))
    px = img.load()

    bones = traits["Skull Bones"]
    accent = ACCENT_COLORS[traits["Logo Accent"]]
    teeth_trait = traits["Teeth"]

    # --- 1. Расширяем силуэт матрицы x SCALE (каждая клетка -> квадрат) ---
    for r, row in enumerate(SKULL_MATRIX):
        for c, ch in enumerate(row):
            if ch != "1":
                continue
            gy0 = SKULL_Y0 + r * SCALE
            gx0 = SKULL_X0 + c * SCALE
            color = bone_color(bones, gy0)
            for dy in range(SCALE):
                for dx in range(SCALE):
                    px[gx0 + dx, gy0 + dy] = (color[0], color[1], color[2], 255)

    # --- 2. Вырезаем силуэт логотипа FOMO в лицевой части ---
    #     (там, где под логотипом есть кость — ставим цвет акцента)
    for lr, lrow in enumerate(FOMO_LOGO):
        for lc, ch in enumerate(lrow):
            if ch != "#":
                continue
            mr = LOGO_MATRIX_ROW + lr
            mc = LOGO_MATRIX_COL + lc
            if not (0 <= mr < 18 and 0 <= mc < 20):
                continue
            if SKULL_MATRIX[mr][mc] != "1":
                continue  # не вылезаем за границы черепа
            gy0 = SKULL_Y0 + mr * SCALE
            gx0 = SKULL_X0 + mc * SCALE
            for dy in range(SCALE):
                for dx in range(SCALE):
                    px[gx0 + dx, gy0 + dy] = (accent[0], accent[1], accent[2], 255)

    # --- 3. Красим зубы (строки 15..17) по трейту Teeth ---
    teeth_cells = []
    for r in (15, 16, 17):
        for c, ch in enumerate(SKULL_MATRIX[r]):
            if ch == "1":
                teeth_cells.append((r, c))

    teeth_color = TEETH_COLORS[teeth_trait]
    gold_cell = None
    if teeth_trait == "Gold Tooth":
        # Редкий золотой зуб: ровно ОДИН случайный пиксель-зуб золотой,
        # остальные — классический белый.
        gold_cell = rng.choice(teeth_cells)
        teeth_color = TEETH_COLORS["Classic White"]

    for (r, c) in teeth_cells:
        color = teeth_color
        if gold_cell == (r, c):
            color = TEETH_COLORS["Gold Tooth"]
        gy0 = SKULL_Y0 + r * SCALE
        gx0 = SKULL_X0 + c * SCALE
        for dy in range(SCALE):
            for dx in range(SCALE):
                px[gx0 + dx, gy0 + dy] = (color[0], color[1], color[2], 255)

    # --- 4. Номер токена "#0001" внизу по центру (пиксельный шрифт 5x7) ---
    label = "#%04d" % token_id
    glyph_w = 5
    gap = 1
    text_w = len(label) * glyph_w + (len(label) - 1) * gap
    tx0 = (GRID - text_w) // 2

    # сначала тень (сдвиг +1 клетка), затем сам текст
    for pass_, (color, offset) in enumerate([(TEXT_SHADOW, 1), (TEXT_COLOR, 0)]):
        cx = tx0
        for ch in label:
            bitmap = PIXEL_FONT[ch]
            for gr, brow in enumerate(bitmap):
                for gc, bch in enumerate(brow):
                    if bch != "#":
                        continue
                    gx = cx + gc + offset
                    gy = TEXT_Y0 + gr + offset
                    if 0 <= gx < GRID and 0 <= gy < GRID:
                        px[gx, gy] = color
            cx += glyph_w + gap

    return img


# ============================================================
# ФОН (1000x1000 RGBA) — 4 базовых цвета + паттерн по варианту
# ============================================================
def build_background(traits, rng):
    bg_trait = traits["Background"]
    variant = traits["Variant"]

    base = BG_COLORS[bg_trait]
    img = Image.new("RGBA", (SIZE, SIZE), base + (255,))
    overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Deep Purple: мягкое свечение в центре
    if bg_trait == "Deep Purple":
        for i in range(14):
            radius = 420 - i * 28
            alpha = 4 + i  # чем ближе к центру, тем ярче
            draw.ellipse(
                [SIZE // 2 - radius, SIZE // 2 - radius,
                 SIZE // 2 + radius, SIZE // 2 + radius],
                fill=(70, 30, 110, alpha),
            )

    # Cyber Slate: диагональная штриховка
    if bg_trait == "Cyber Slate":
        for x in range(-SIZE, SIZE, 60):
            draw.line([(x, 0), (x + SIZE, SIZE)], fill=(255, 255, 255, 6), width=1)

    # Паттерн по варианту (0 — чисто, 1 — точки, 2 — линии, 3 — сетка точек)
    mode = variant % 4
    if mode == 1:
        # разбросанные "звёзды"/шум
        for _ in range(260):
            x = rng.randrange(SIZE)
            y = rng.randrange(SIZE)
            a = rng.randrange(14, 44)
            s = 1 if rng.random() < 0.75 else 2
            draw.rectangle([x, y, x + s, y + s], fill=(255, 255, 255, a))
    elif mode == 2:
        # тонкие горизонтальные линии (терминальная строка)
        for y in range(0, SIZE, 50):
            draw.line([(0, y), (SIZE, y)], fill=(255, 255, 255, 8), width=1)
    elif mode == 3:
        # точечная сетка
        for y in range(25, SIZE, 50):
            for x in range(25, SIZE, 50):
                draw.point((x, y), fill=(255, 255, 255, 22))

    img = Image.alpha_composite(img, overlay)
    return img


# ============================================================
# ОБВОДКА И СЕТКА
# ============================================================
def apply_outline_and_grid(bg, skull):
    """
    1) Маска 50x50 -> 1000x1000 резким апскейлом NEAREST (пиксели остаются чёткими).
    2) Тонкая контрастная обводка: дилатация альфа-маски черепа минус сама маска.
    3) Едва заметная сетка по клеткам 20x20 поверх всего кадра.
    """
    # nearest neighbor: каждая клетка 50x50 -> квадрат 20x20 px без сглаживания
    skull = skull.resize((SIZE, SIZE), Image.NEAREST)

    mask = skull.split()[3]                                   # канал альфа (L)
    dilated = mask.filter(ImageFilter.MaxFilter(5))           # +2px в каждую сторону
    outline_mask = ImageChops.subtract(dilated, mask)         # только внешний край

    outline_layer = Image.new("RGBA", (SIZE, SIZE), OUTLINE_COLOR)
    outline_layer.putalpha(outline_mask)
    result = Image.alpha_composite(bg, outline_layer)

    # сам череп поверх обводки
    result = Image.alpha_composite(result, skull)

    # сетка по клеткам
    grid_overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grid_overlay)
    for i in range(0, SIZE + 1, CELL):
        gdraw.line([(i, 0), (i, SIZE)], fill=GRID_LINE_COLOR, width=1)
        gdraw.line([(0, i), (SIZE, i)], fill=GRID_LINE_COLOR, width=1)
    result = Image.alpha_composite(result, grid_overlay)

    return result


# ============================================================
# МЕТАДАННЫЕ ERC-721 / OPENSEA
# ============================================================
def build_metadata(token_id, traits, image_filename):
    label = "#%04d" % token_id
    attributes = [
        {"trait_type": "Background", "value": traits["Background"]},
        {"trait_type": "Skull Bones", "value": traits["Skull Bones"]},
        {"trait_type": "Logo Accent", "value": traits["Logo Accent"]},
        {"trait_type": "Teeth", "value": traits["Teeth"]},
        {"trait_type": "Variant", "value": "V%d" % traits["Variant"]},
    ]
    return {
        "name": "FOMO Skull %s" % label,
        "description": (
            "FOMO Skull %s — one of 2000 unique pixel-art skulls drawn on a strict "
            "50x50 grid (1000x1000 PNG, nearest neighbor). The face carries the FOMO "
            "logo mask (two rounded connected links). Bones, accent, teeth and "
            "background are layered traits with weighted rarity."
        ) % label,
        "image": "images/%s" % image_filename,
        "external_url": EXTERNAL_URL,
        "attributes": attributes,
    }


# ============================================================
# ГЕНЕРАЦИЯ КОЛЛЕКЦИИ
# ============================================================
def generate(count, out_dir, seed, name_prefix=None):
    validate_matrices()

    images_dir = os.path.join(out_dir, "images")
    metadata_dir = os.path.join(out_dir, "metadata")
    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(metadata_dir, exist_ok=True)

    rng = random.Random(seed)
    used_dna = set()
    started = time.time()
    collisions = 0

    for token_id in range(1, count + 1):
        # --- DNA-проверка уникальности: пересэмпливаем при коллизии ---
        for attempt in range(100000):
            traits = sample_traits(rng)
            dna = dna_of(traits)
            if dna not in used_dna:
                break
            collisions += 1
        else:
            raise RuntimeError(
                "Не удалось подобрать уникальный набор трейтов для токена #%d" % token_id
            )

        used_dna.add(dna)

        # --- Рендер ---
        skull = build_skull_layer(traits, token_id, rng)
        background = build_background(traits, rng)
        final = apply_outline_and_grid(background, skull)

        # nearest neighbor: клетка уже 20x20 (без сглаживания),
        # при желании можно явно усилить резкость:
        # final = final.resize((SIZE, SIZE), Image.NEAREST)

        filename = "%04d.png" % token_id
        final.convert("RGB").save(
            os.path.join(images_dir, filename),
            format="PNG",
            optimize=True,
        )

        # --- Метаданные ERC-721 ---
        if name_prefix:
            meta = build_metadata(token_id, traits, filename)
            meta["name"] = "%s %s" % (name_prefix, "#%04d" % token_id)
        else:
            meta = build_metadata(token_id, traits, filename)

        with open(os.path.join(metadata_dir, "%04d.json" % token_id),
                  "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
            f.write("\n")

        if token_id % 100 == 0 or token_id == count:
            elapsed = time.time() - started
            print(
                "[%d/%d] готово | уникальных DNA: %d | коллизий: %d | %.1f сек"
                % (token_id, count, len(used_dna), collisions, elapsed),
                flush=True,
            )

    elapsed = time.time() - started
    print("-" * 60)
    print("Готово: %d изображений + %d JSON" % (count, count))
    print("Уникальных DNA: %d (дубликатов: %d)" % (len(used_dna), count - len(used_dna)))
    print("Время: %.1f сек" % elapsed)
    print("Вывод: %s" % os.path.abspath(out_dir))


def main():
    parser = argparse.ArgumentParser(
        description="Генератор NFT-коллекции пиксельных черепов (2000 шт., 1000x1000)."
    )
    parser.add_argument("--count", type=int, default=2000,
                        help="количество токенов (по умолчанию 2000)")
    parser.add_argument("--out", type=str, default="output",
                        help="папка вывода (по умолчанию ./output)")
    parser.add_argument("--seed", type=int, default=42,
                        help="seed ГСЧ для воспроизводимости (по умолчанию 42)")
    parser.add_argument("--name-prefix", type=str, default=None,
                        help="префикс имени токена (по умолчанию 'FOMO Skull')")
    args = parser.parse_args()

    print("FOMO SKULL NFT GENERATOR")
    print("count=%d out=%s seed=%s" % (args.count, args.out, args.seed))
    generate(args.count, args.out, args.seed, args.name_prefix)


if __name__ == "__main__":
    main()
