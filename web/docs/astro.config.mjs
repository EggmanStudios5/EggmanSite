import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.eggmanstudios.me',
  integrations: [
    starlight({
      title: 'Eggman Studios Docs',
      description: 'Setup, wiring, firmware, and release verification guides for Eggman Studios projects.',
      social: {
        github: 'https://github.com/EggmanStudios5'
      },
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Macro Pad Setup', slug: 'guides/macro-setup' },
            { label: 'DIY Macro Pad Assembly', slug: 'guides/macro-diy' },
            { label: 'Mateo Mounting Blueprint', slug: 'guides/mateo-mount' },
            { label: 'RFID Split-Node Wiring', slug: 'guides/rfid-wiring' },
            { label: 'AltStore & Release Verification', slug: 'guides/altstore-releases' }
          ]
        }
      ]
    })
  ]
});
