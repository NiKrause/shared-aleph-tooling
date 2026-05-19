# universal-connectivity Integration Example

This example directory is for the thin integration pattern used by
`universal-connectivity`.

The intended shape is:

- UC keeps its upstream-friendly workflow entrypoints
- the entrypoints call the shared GitHub Action and shared reusable workflow
- UC-specific profile wiring stays small and easy to diff against upstream

This is a reference integration shape, not a suggestion that other repositories
should deploy `uc-go-peer` directly.

Useful example material for this folder:

- wrapper workflow calling the shared reusable workflow
- compatibility wrapper action preserving existing UC output names
- profile-specific rootfs contract handoff into shared tooling

For the real upstream integration work, see:

- `universal-connectivity` PR `#344`
