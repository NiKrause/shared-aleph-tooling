# Svelte Sponsor Relay Consumer

Minimal Svelte usage:

```svelte
<script>
  import SponsorRelayFab from '@le-space/ui/svelte'
  export let libp2p
</script>

<SponsorRelayFab
  {libp2p}
  manifestUrl="https://example.com/rootfs-manifest.json"
  showInstances={true}
/>
```
