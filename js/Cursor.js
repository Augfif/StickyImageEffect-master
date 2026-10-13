const lerp = (a, b, n) => (1 - n) * a + n * b;
const body = document.body;
// The ring is the only pointer on the page now (the native one is hidden in
// css), so it follows a touch tighter than the 0.15 it used to share with the
// dot.
const FOLLOW = 0.22;
const getMousePos = (e) => {
    let posx = 0;
    let posy = 0;
    if (!e) e = window.event;
    if (e.pageX || e.pageY) {
        posx = e.pageX;
        posy = e.pageY;
    }
    else if (e.clientX || e.clientY) 	{
        posx = e.clientX + body.scrollLeft + document.documentElement.scrollLeft;
        posy = e.clientY + body.scrollTop + document.documentElement.scrollTop;
    }
    return { x : posx, y : posy }
}

class Cursor {
    constructor(el) {
        this.DOM = {el: el};
        this.DOM.circle = this.DOM.el.querySelector('.cursor__inner--circle');
        this.bounds = {circle: this.DOM.circle.getBoundingClientRect()};
        this.scale = 1;
        this.mousePos = {x:0, y:0};
        this.lastMousePos = {circle: {x:0, y:0}};
        this.lastScale = 1;
        
        this.initEvents();
        requestAnimationFrame(() => this.render());
    }
    initEvents() {
        window.addEventListener('mousemove', ev => this.mousePos = getMousePos(ev));
    }
    render() {
        this.lastMousePos.circle.x = lerp(this.lastMousePos.circle.x, this.mousePos.x - this.bounds.circle.width/2, FOLLOW);
        this.lastMousePos.circle.y = lerp(this.lastMousePos.circle.y, this.mousePos.y - this.bounds.circle.height/2, FOLLOW);
        this.lastScale = lerp(this.lastScale, this.scale, 0.15);
        this.DOM.circle.style.transform = `translateX(${(this.lastMousePos.circle.x)}px) translateY(${this.lastMousePos.circle.y}px) scale(${this.lastScale})`;
        requestAnimationFrame(() => this.render());
    }
    enter() {
        this.scale = 1.5;
    }
    leave() {
        this.scale = 1;
    }
}

export { Cursor };
