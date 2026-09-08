# Default block height: decision options

Status: unresolved product decision for issue #512. No height constants or
saved-build behavior are changed by this document.

The current model uses integer Y positions and three plate units per brick.
Both scene constants `STUD` and `PLATE` are currently 1.0. The physical metadata
`PLATE_HEIGHT_MM = 3.2` does not by itself control every rendered or physics
height. Changing that metadata alone would not halve the visible bricks.

| Option                                                                                     | Result                                                                                          | Compatibility and implementation cost                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recommended if the goal is visual proportion:** halve the scene's Y scale for every part | Bricks, plates, spacing and collapse bodies appear half as tall; logical brick height remains 3 | Preserve integer coordinates and serialized v1–v4 data. Existing builds also look shorter. Apply the same scene transform to rendering, raycast conversion, camera targeting, bounds and Rapier bodies; changing meshes alone is insufficient. |
| Change all brick bodies to 1.5 logical plate units                                         | Bricks get shorter while plates retain their old physical height                                | Requires a finer integer grid or fractional occupancy redesign and explicit saved-build migration; affects support, collision, shear and collapse.                                                                                             |
| Change only `brick-2x4`                                                                    | Only the default catalog part becomes shorter                                                   | Produces a different stacking ratio for this part; requires migration/version policy for saved instances and cannot use the existing integer-positive height schema unchanged.                                                                 |

Before implementation, choose which visual result is intended and whether
existing saved builds should also change appearance. If their appearance must
remain identical, even the first option needs a persisted scale/version policy
rather than a silent global change.

For the recommended visual option, tests should establish that grid stacking
and saved payloads are unchanged, a three-unit logical brick renders at 1.5
scene units, pointer picking lands on the correct logical Y, and collapse
colliders/ground/body positions agree with the visual geometry. Test classic,
offset, SNOT and hinge parts together, including export/import and undo.
