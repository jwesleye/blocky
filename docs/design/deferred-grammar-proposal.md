# Proposed Technic and angled connection contract

Status: proposal for maintainer review. This document does not expand the
accepted scope in PRD §6 or §11, and no v5/v6 runtime support is implemented.
It supplies a concrete starting contract for issues #589 and #590, whose
existing descriptions leave geometry and persistence decisions open.

## Recommended first slice: rigid axial pins (issue #589)

Use two dedicated parts, `technic-pin-1x1` and `technic-socket-1x1`.
Each has a one-stud-square, three-plate-high body, bottom anti-studs, and top
studs. Pin joints are rigid connections in this slice; neither friction,
sliding nor free spinning is simulated. Standard studs continue to ground
these parts through their bodies.

Local coordinates are measured from the unrotated body's minimum corner:
X/Z in studs, Y in plates. The body occupies [0,1] × [0,3] × [0,1].
The connector center is (1,1.5,0.5) on the positive-X face. The pin part
exposes endpoint `pin`; the socket part exposes endpoint `socket`. Each
endpoint's outward normal is +X. The existing four Y rotations transform the
body and endpoint together, so available axes are ±X and ±Z.

A pin stem has radius 0.15 stud and projects 0.25 stud from the face.
A socket recess has radius 0.16 stud and depth 0.26 stud into the face.
Render the recess as an actual cavity. Insertion is a placement operation,
not a physics animation. At full insertion the two face centers coincide,
the outward normals oppose, and the bodies meet without volumetric overlap.
Example: a rotation-0 pin at anchor (4,0,4) mates with a rotation-2 socket
at (5,0,4); both endpoint centers become (5,1.5,4.5).

An endpoint accepts exactly one partner. A prospective placement must have
coincident centers within 1e-6 scene units and opposite normals. Require a
pin/socket pair; pin/pin and socket/socket never connect. Reject occupied
endpoints and duplicate joints. Reject a pin's protruding stem intersecting
anything except its one matched socket recess. Ordinary body collisions and
baseplate bounds remain enforced, including protrusions at the board edge.
Adjacent unrelated bricks do not acquire an implicit pin joint.

For this slice, disallow offset, mount and hinge metadata on these two parts.
They may stud-stack with classic parts and participate in a build that also
contains other grammars, but their pin endpoints mate only with each other.
The graph adds one undirected edge for each validated pin joint. A connected
component must still reach the baseplate and satisfy the existing balance
rules. Collapse must move the connected bodies consistently; a pin does not
magically stabilize a component whose center of mass fails the balance rule.

## Proposed v5 envelope

The current serialization discards runtime brick IDs and restores new IDs on
load. Add explicit joints without relying on those ephemeral IDs:

```json
{
  "version": 5,
  "baseplate": { "size": 32 },
  "bricks": [
    {
      "partId": "technic-pin-1x1",
      "color": "red",
      "x": 4,
      "y": 0,
      "z": 4,
      "rot": 0
    },
    {
      "partId": "technic-socket-1x1",
      "color": "blue",
      "x": 5,
      "y": 0,
      "z": 4,
      "rot": 2
    }
  ],
  "joints": [
    {
      "type": "pin",
      "a": { "brick": 0, "endpoint": "pin" },
      "b": { "brick": 1, "endpoint": "socket" }
    }
  ]
}
```

`brick` is a zero-based index in the envelope's `bricks` array. Convert these
indices to runtime IDs at load and back to indices at save. Selection edits,
delete, duplicate, undo and redo must include joints atomically. Deleting a
brick removes its joints. Duplicating a selection remaps internal joints and
omits connections to bricks outside that selection; the duplicate must still
pass placement validation before commit.

Require v5 when either dedicated Technic part or any joint is present. Omit
`joints` and preserve the current version inference and payload semantics for
builds without Technic parts. Reject new parts or joints in older envelopes;
do not silently strip the fields. Frontend and backend both validate endpoint
indices, part/endpoint compatibility, occupancy and geometry. Autosave, JSON,
share URLs and gallery payloads carry the same validated envelope.

## Proposed second slice: indexed pin rotation (issue #590)

Build on the accepted and implemented v5 contract. Allow an explicit joint
rotation of -45°, 0° or +45° about the parent's socket axis; no continuous
rotation. Zero follows the v5 pose. A positive angle follows the right-hand
rule around the socket's outward normal. Selecting an angle rotates the
child's entire body and connector about the common endpoint center; the
renderer, ghost, bounds, collisions, grounding and collapse all use that same
pose. Keep the pin/socket engagement constant.

For the first angled slice require a rooted tree: a classic-grounded socket
is the root and each angled child has one incoming joint. Reject cycles,
multiple incoming joints and secondary stud contacts from rotated children.
Do not combine angled joints with offset, SNOT or hinge metadata on either
endpoint. Other disconnected, already-supported parts may coexist in the
same build. These limits avoid contradictory loop constraints and implicit
support from a rotated axis-aligned footprint.

Use v6 for a nonzero joint angle. Store the directed parent/child endpoint
references plus `angle: -45 | 0 | 45`; interpret the child's integer anchor
and `rot` as its zero-angle reference pose. Derive its displayed world pose
from the parent endpoint and angle, rather than storing rounded transformed
coordinates. A zero-angle-only build stays v5. Reject nonzero angles in v5
and all joint fields in v1–v4.

Axis-aligned occupied-cell tests cannot validate the rotated body. Before
implementation, prototype oriented shape contact with the existing Rapier
library, keeping React and three.js out of `src/domain/`. Pin/socket contact
exclusions must remain limited to the engaged stem/recess. If contact or
collapse behavior cannot be represented correctly, reject the proposed
placement with an explicit explanation instead of accepting an approximate
support edge. Do not ship a schema-only v6 feature as completed angled support.

## Acceptance examples for the eventual implementation

| Case                                                             | Required result                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Example pin/socket pair above                                    | Mates; one graph edge; unchanged pose after all persistence round-trips             |
| Pin paired to another pin, occupied socket, or mismatched height | Rejected with an actionable reason                                                  |
| Detached elevated pin/socket component                           | Placement rejected as floating                                                      |
| Stem penetrates an ordinary brick                                | Rejected as collision                                                               |
| Delete a supporting endpoint                                     | Joint removed atomically; unsupported connected pieces collapse; undo restores both |
| Duplicate two connected parts                                    | Internal joint remapped; original and duplicate do not share endpoint IDs           |
| v4 envelope contains a Technic part or joints                    | Rejected by frontend and backend                                                    |
| +45° child intersects the baseplate or another body              | Rejected; preview matches committed geometry                                        |
| Nonzero angle survives autosave/share/gallery                    | v6 pose and endpoint relationships preserved exactly                                |
| Legacy build without new parts or joints                         | Remains v1–v4; no migration or added fields                                         |

The maintainer decision is whether to accept this limited geometry, rigid-joint
behavior and index-based persistence contract. Acceptance would unlock #589;
#590 still depends on working v5 geometry and the angled-contact prototype.
