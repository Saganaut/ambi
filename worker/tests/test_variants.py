"""Bounding-box maths and real Pillow encodes across every accepted input format."""

from __future__ import annotations

from io import BytesIO

import pytest
from PIL import Image

from ambi_image_worker.variants import UndecodableImage, render_tiers
from conftest import avif_bytes, avif_supported, gif_bytes, jpeg_bytes, png_bytes

ALL_TIERS = {"XS": 64, "SM": 200, "MD": 480, "LG": 960, "XL": 1600}


def size_of(data: bytes) -> tuple[int, int]:
    with Image.open(BytesIO(data)) as image:
        return image.size


def format_of(data: bytes) -> str:
    with Image.open(BytesIO(data)) as image:
        return image.format or ""


def rotated_jpeg_bytes(width: int, height: int, orientation: int) -> bytes:
    """A JPEG whose stored pixels are ``width x height`` under an EXIF orientation tag."""
    exif = Image.Exif()
    exif[0x0112] = orientation
    buffer = BytesIO()
    with Image.open(BytesIO(jpeg_bytes(width, height))) as image:
        image.save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


def test_renders_one_rendition_per_requested_tier():
    rendered = render_tiers(png_bytes(1000, 500), ALL_TIERS)

    assert set(rendered) == set(ALL_TIERS)


def test_every_rendition_decodes_as_webp():
    rendered = render_tiers(png_bytes(1000, 500), ALL_TIERS)

    assert {format_of(data) for data in rendered.values()} == {"WEBP"}


def test_fits_within_the_bounding_box_preserving_aspect_ratio():
    rendered = render_tiers(png_bytes(1000, 500), ALL_TIERS)

    assert size_of(rendered["XS"]) == (64, 32)
    assert size_of(rendered["SM"]) == (200, 100)
    assert size_of(rendered["MD"]) == (480, 240)
    assert size_of(rendered["LG"]) == (960, 480)


def test_bounds_the_taller_edge_for_a_portrait_source():
    rendered = render_tiers(png_bytes(500, 1000), {"MD": 480})

    assert size_of(rendered["MD"]) == (240, 480)


def test_never_upscales_a_small_source():
    rendered = render_tiers(png_bytes(32, 24), ALL_TIERS)

    assert size_of(rendered["XS"]) == (32, 24)
    assert size_of(rendered["XL"]) == (32, 24)


def test_source_exactly_on_the_bound_is_untouched():
    rendered = render_tiers(png_bytes(480, 480), {"MD": 480})

    assert size_of(rendered["MD"]) == (480, 480)


def test_preserves_transparency():
    rendered = render_tiers(png_bytes(200, 200, mode="RGBA"), {"SM": 200})

    with Image.open(BytesIO(rendered["SM"])) as image:
        assert image.mode == "RGBA"
        assert min(image.getchannel("A").getextrema()) < 255


def test_accepts_jpeg_input():
    rendered = render_tiers(jpeg_bytes(800, 400), {"MD": 480})

    assert size_of(rendered["MD"]) == (480, 240)


def test_applies_exif_orientation_to_the_rendered_pixels():
    source = rotated_jpeg_bytes(800, 400, orientation=6)

    assert size_of(source) == (800, 400)

    rendered = render_tiers(source, {"MD": 480})

    assert size_of(rendered["MD"]) == (240, 480)


def test_leaves_an_untagged_source_unrotated():
    rendered = render_tiers(jpeg_bytes(800, 400), {"MD": 480})

    assert size_of(rendered["MD"]) == (480, 240)


def test_accepts_palette_gif_input():
    rendered = render_tiers(gif_bytes(300, 150), {"SM": 200})

    assert size_of(rendered["SM"]) == (200, 100)
    assert format_of(rendered["SM"]) == "WEBP"


def test_accepts_grayscale_input():
    rendered = render_tiers(png_bytes(300, 150, mode="L"), {"SM": 200})

    assert size_of(rendered["SM"]) == (200, 100)


@pytest.mark.skipif(not avif_supported(), reason="Pillow build has no AVIF support")
def test_accepts_avif_input():
    rendered = render_tiers(avif_bytes(300, 150), {"SM": 200})

    assert size_of(rendered["SM"]) == (200, 100)
    assert format_of(rendered["SM"]) == "WEBP"


@pytest.mark.parametrize("source", [b"", b"not an image at all", b"\x89PNG\r\n\x1a\n truncated"])
def test_undecodable_bytes_raise(source: bytes):
    with pytest.raises(UndecodableImage):
        render_tiers(source, {"SM": 200})
