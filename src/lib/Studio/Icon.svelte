<script lang="ts">
export let name: string;
export let size = '24';
export let viewBox = '0 0 24 24';
export let flip = 'none';
export let rotate = 0;

$: sx = ['both', 'horizontal'].includes(flip) ? '-1' : '1';
$: sy = ['both', 'vertical'].includes(flip) ? '-1' : '1';
$: r = Number.isNaN(rotate) ? rotate : `${rotate}deg`;
</script>

{#await import('@mdi/js') then paths}
  <svg
    width={size}
    height={size}
    {viewBox}
    style="--sx:{sx}; --sy:{sy}; --r:{r}"
    class:spin={name === 'mdiLoading'}
    {...$$restProps}
  >
    <path d={typeof paths[name as keyof typeof paths] === 'string' ? paths[name as keyof typeof paths] as string : ''} />
  </svg>
{/await}

<style>
  svg {
    transform: rotate(var(--r, 0deg)) scale(var(--sx, 1), var(--sy, 1));
  }

  path {
    fill: currentColor;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .spin {
    animation: spin 1s linear infinite;
  }
</style> 