# React Sponsor Relay Consumer

Minimal React usage:

```tsx
import SponsorRelayFab from '@le-space/ui/react'

export function App({ libp2p }) {
  return (
    <SponsorRelayFab
      libp2p={libp2p}
      manifestUrl="https://example.com/rootfs-manifest.json"
      showInstances
    />
  )
}
```
