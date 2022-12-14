let move_right = document.getElementsByClassName("turn-right");
let move_left = document.getElementsByClassName("turn-left");
let pages = document.getElementsByClassName("page");

move_left[0].addEventListener("click", change_right);
move_right[0].addEventListener("click", change_left);

function change_left(event) {
    for (let i = 0; i < pages.length; i++) {
        if (pages[i].classList.contains('not-translate')){
            pages[i].classList.remove('not-translate')
            pages[i].classList.add('translate-l')
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