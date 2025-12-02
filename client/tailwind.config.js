/** @type {import('tailwindcss').Config} */
module.exports = {
  
  // --- ADD THIS LINE ---
  darkMode: 'class', 
  
  content: [
    "./src/**/*.{html,ts}", // Make sure this path is correct
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
