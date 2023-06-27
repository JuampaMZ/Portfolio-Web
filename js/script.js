let move_right = document.getElementsByClassName("turn-right");
let move_left = document.getElementsByClassName("turn-left");
let pages = document.getElementsByClassName("page");
let move_right_mobile = document.getElementsByClassName("turn-right-mobile");
let move_left_mobile = document.getElementsByClassName("turn-left-mobile");

move_left[0].addEventListener("click", change_right);
move_right[0].addEventListener("click", change_left);
move_left_mobile[0].addEventListener("click", change_right);
move_right_mobile[0].addEventListener("click", change_left);

function change_left(event) {
    for (let i = 0; i < pages.length; i++) {
        if (pages[i].classList.contains('not-translate')){
            pages[i].classList.remove('not-translate')
            pages[i].classList.add('translate-l')
            pages[i].classList.remove('z-index-3')
            pages[i].classList.add('z-index-2')
            if((i-1) >= 0) {
                pages[i-1].classList.remove('z-index-2')
                pages[i-1].classList.add('z-index-1')
            } else {
                pages[pages.length-1].classList.remove('z-index-2')
                pages[pages.length-1].classList.add('z-index-1')
            }
            if((i+1) < pages.length) {
                pages[i+1].classList.remove('z-index-1')
                pages[i+1].classList.add('z-index-3')
            } else {
                pages[0].classList.remove('z-index-1')
                pages[0].classList.add('z-index-3')
            }
            continue
        }
        if (pages[i].classList.contains('translate-l')){
            pages[i].classList.remove('translate-l')
            pages[i].classList.add('translate-r')
            continue
        }
        if (pages[i].classList.contains('translate-r')){
            pages[i].classList.add('not-translate')
            pages[i].classList.remove('translate-r')
            continue
        }
    }
}

function change_right(event) {
    for (let i = 0; i < pages.length; i++) {
        if (pages[i].classList.contains('not-translate')){
            pages[i].classList.remove('not-translate')
            pages[i].classList.add('translate-r')
            pages[i].classList.remove('z-index-3')
            pages[i].classList.add('z-index-2')
            if((i-1) >= 0) {
                pages[i-1].classList.remove('z-index-1')
                pages[i-1].classList.add('z-index-3')
            } else {
                pages[pages.length-1].classList.remove('z-index-1')
                pages[pages.length-1].classList.add('z-index-3')
            }
            if((i+1) < pages.length) {
                pages[i+1].classList.remove('z-index-2')
                pages[i+1].classList.add('z-index-1')
            } else {
                pages[0].classList.remove('z-index-2')
                pages[0].classList.add('z-index-1')
            }
            continue
        }
        if (pages[i].classList.contains('translate-r')){
            pages[i].classList.remove('translate-r')
            pages[i].classList.add('translate-l')
            continue
        }
        if (pages[i].classList.contains('translate-l')){
            pages[i].classList.add('not-translate')
            pages[i].classList.remove('translate-l')
            continue
        }
    }
}

let pages_height = document.getElementsByClassName("pages");
let page_height = document.getElementsByClassName("page");

/* function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
} */

window.addEventListener("resize", ajust_height);
window.addEventListener("load", ajust_height);

function ajust_height() {
    let max_height = 0;
    pages_height[0].style.removeProperty("height")
    for (let i = 0; i < page_height.length; i++) {
        if (page_height[i].clientHeight > max_height){
            max_height = page_height[i].clientHeight;
        }
    }
    pages_height[0].style.height = max_height + "px";
}

let link_constancia_sembrando = document.getElementsByClassName("link-constancia-sembrando");
let constancia_sembrando = document.getElementsByClassName("constancia-sembrando");
let overflow_body = document.getElementsByClassName("body")

link_constancia_sembrando[0].addEventListener("click", show_constancy);
constancia_sembrando[0].addEventListener("click", show_constancy);

function show_constancy(event) {
    constancia_sembrando[0].classList.toggle("d-none")
    console.log(event)
    let top = (event.pageY - event.y)
    constancia_sembrando[0].style.top = top + 'px'
    overflow_body[0].classList.toggle("overflow-hiden")
}

let polygon = document.getElementsByClassName("drop-cv");
let arrow_turn = document.getElementsByClassName("arrow-nav-mobile")
let ul_polygon = document.getElementsByClassName("ul-inside-mobile")
let ul_li = document.getElementsByClassName("header-nav-ul-li-mobile")

polygon[0].addEventListener("click", show_polygon);

for (let i = 0; i < ul_li.length; i++) {
    if (ul_li[i] != polygon[0])
    ul_li[i].addEventListener("click", show_polygon_remove);
}

function show_polygon(event) {
    console.log("ooo");
    arrow_turn[0].classList.toggle("arrow-nav-mobile-polygon")
    ul_polygon[0].classList.toggle("ul-inside-mobile-polygon")
    polygon[1].classList.toggle("drop-cv-active")
}

function show_polygon_remove(event) {
    arrow_turn[0].classList.remove("arrow-nav-mobile-polygon")
    ul_polygon[0].classList.remove("ul-inside-mobile-polygon")
    polygon[1].classList.remove("drop-cv-active")
}

let nav_hamburger = document.getElementsByClassName("nav-hamburger")
let header_nav_mobile = document.getElementsByClassName("header-nav-mobile")
let cross = document.getElementsByClassName("cross")
let contact = document.getElementsByClassName("contact")
let download_cv = document.getElementsByClassName("download-cv")


nav_hamburger[0].addEventListener("click", show_nav_mobile);
cross[0].addEventListener("click", show_nav_mobile);
cross[0].addEventListener("click", show_polygon_remove);
contact[0].addEventListener("click", show_nav_mobile);
download_cv[0].addEventListener("click", show_nav_mobile);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function show_nav_mobile(event) {
    header_nav_mobile[0].classList.toggle("width-50")
    if (cross[0].classList.contains("d-none")){
        cross[0].classList.toggle("d-none")
    } else {
        sleep(300).then(() => {cross[0].classList.toggle("d-none")})
    }
}

let bg_1 = document.getElementsByClassName("bg-1")
let bg_2 = document.getElementsByClassName("bg-2")
let bg_3 = document.getElementsByClassName("bg-3")
let bg_body = document.getElementsByClassName("bg-body")
let dark_mode = document.getElementsByClassName("dark-mode")
let light_dark = document.getElementsByClassName("bg-light")
let white_black = document.getElementsByClassName("text-dark")
let black_white = document.getElementsByClassName("text-white")
let ul_inside = document.getElementsByClassName("ul-inside")
let bg_project = document.getElementsByClassName("project")
let logo_abilities = document.getElementsByClassName("drop-shadow")
let points = document.getElementsByClassName("point")
let timeline = document.getElementsByClassName("timeline")
let arrow_turn_monitor = document.getElementsByClassName("arrow-nav")
let hamburger_svg = document.getElementsByClassName("nav-hamburger-img")
let bg_project_1 = document.getElementsByClassName("bg-project-1")
let bg_project_1_mobile = document.getElementsByClassName("bg-project-1-mobile")
let svg_footer = document.getElementsByClassName("svg-contact")


for (let i = 0; i < dark_mode.length; i++) {
    dark_mode[i].addEventListener("click", show_dark);
}

function show_dark(event) {
/*     bg_1[0].classList.toggle("bg-1")
    bg_2[0].classList.toggle("bg-2")
    bg_3[0].classList.toggle("bg-3") 
    bg_body[0].classList.toggle("bg-body")*/
    bg_1[0].classList.toggle("bg-1-dark")
    bg_2[0].classList.toggle("bg-2-dark")
    bg_3[0].classList.toggle("bg-3-dark")
    bg_body[0].classList.toggle("bg-body-dark")
    for (let i = 0; i < light_dark.length; i++) {
        light_dark[i].classList.toggle("bg-dark");
    }
    for (let i = 0; i < white_black.length; i++) {
        white_black[i].classList.toggle("text-gray");
    }
    for (let i = 0; i < black_white.length; i++) {
        black_white[i].classList.toggle("text-gray");
    }
    for (let i = 0; i < bg_project.length; i++) {
        bg_project[i].classList.toggle("project-dark");
        bg_project[i].classList.toggle("filter-dark");
    }
    for (let i = 0; i < logo_abilities.length; i++) {
        logo_abilities[i].classList.toggle("filter-dark");
    }
    for (let i = 0; i < points.length; i++) {
        points[i].classList.toggle("point-dark");
    }
    timeline[0].classList.toggle("timeline-dark")
    ul_polygon[0].classList.toggle("ul-inside-mobile-dark")
    ul_inside[0].classList.toggle("ul-inside-dark")
    arrow_turn[0].classList.toggle("arrow-nav-mobile-dark")
    arrow_turn_monitor[0].classList.toggle("arrow-nav-dark")
    hamburger_svg[0].classList.toggle("nav-hamburger-img-dark")
    for (let i = 0; i < dark_mode.length; i++) {
        dark_mode[i].classList.toggle("d-none")
    }
    bg_project_1[0].classList.toggle("bg-project-1-dark")
    bg_project_1_mobile[0].classList.toggle("bg-project-1-mobile-dark")

    if(event.target.classList.contains("header-nav-ul-li-a-mobile")){
        show_nav_mobile();
    }
    for (let i = 0; i < svg_footer.length; i++) {
        svg_footer[i].classList.toggle("svg-contact-dark")
    }
}



let education_cv = document.getElementsByClassName("education-cv")
let abilities_cv = document.getElementsByClassName("abilities-cv")
let projects_cv = document.getElementsByClassName("projects-cv")

education_cv[0].addEventListener("click", go_to_page);
abilities_cv[0].addEventListener("click", go_to_page);
projects_cv[0].addEventListener("click", go_to_page);
education_cv[1].addEventListener("click", go_to_page);
abilities_cv[1].addEventListener("click", go_to_page);
projects_cv[1].addEventListener("click", go_to_page);

function go_to_page(event){
    console.log(event)
    page_actual=0;

    for (let i = 0; i < pages.length; i++) {
        if (pages[i].classList.contains("not-translate")){
            page_actual = i;
            break;
        }
    }

    if (event.target.classList.contains("abilities-cv")) {
        if (page_actual == 0) {
            change_left();
        }
        if (page_actual == 2) {
            change_right();
        }
        if(event.target.classList.contains("ul-inside-li-a-mobile")){
            show_nav_mobile();
        }
    }

    if (event.target.classList.contains("projects-cv")) {
        if (page_actual == 1) {
            change_right();
        }
        if (page_actual == 2) {
            change_left();
        }
        if(event.target.classList.contains("ul-inside-li-a-mobile")){
            show_nav_mobile();
        }
    }

    if (event.target.classList.contains("education-cv")) {
        if (page_actual == 0) {
            change_right();
        }
        if (page_actual == 1) {
            change_left();
        }
        if(event.target.classList.contains("ul-inside-li-a-mobile")){
            show_nav_mobile();
        }
    }
}

