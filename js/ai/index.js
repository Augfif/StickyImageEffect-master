import { Cursor } from "../Cursor.js";

// base.css hides the native pointer on every element, so this page has to draw
// its own ring like the opener and the slideshow do -- without it the page has
// no pointer at all.
new Cursor(document.querySelector(".cursor"));
