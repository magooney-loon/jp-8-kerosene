import { sveltekit } from '@sveltejs/kit/vite'
import { threlteStudio } from '@threlte/studio/vite'

export default {
  plugins: [threlteStudio(), sveltekit()]
}
