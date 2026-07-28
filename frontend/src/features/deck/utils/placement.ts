// The placement editors' hooks (Axis, Place-on-Image) reach for the normalized
// [0, 1] guards through here.
//
// Every placement answer key is stored in the normalized space the graders
// measure in, so the hooks clamp on the way in rather than trusting whatever a
// surface or a legacy wire payload hands them. The guards themselves are the
// shared ones — the live boards clamp the same coordinates.
import { clamp01, clampPoint } from "@utils/placementGeometry";

export { clamp01, clampPoint };
