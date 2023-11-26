import axios from 'axios';
import Notiflix from 'notiflix';
import SimpleLightbox from 'simplelightbox';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'simplelightbox/dist/simple-lightbox.min.css';
import { PIXABAY_URL } from './api';
import { API_KEY } from './api';

Notiflix.Notify.init({ position: 'center-center' });

let searchQuery = ''; // initializeaza ca sir gol
let currentPage = 1;
let lightbox = new SimpleLightbox('.gallery a', {});
let isEndOfResults = false;

const galleryDiv = document.querySelector('.gallery');
const loadMoreBtn = document.querySelector('.load-more');
const backToFormBtn = document.getElementById('backToFormBtn');
const searchForm = document.getElementById('search-form');

// Functie asincrona care accepta un argument 'query', introdus de utilizator
async function fetchImages(query, currentPage) {
  // Inițializează parametrii pentru solicitarea Axios către API-ul Pixabay.
  const options = {
    params: {
      key: API_KEY,
      q: '',
      image_type: 'photo',
      orientation: 'horizontal',
      page: 1,
      safesearch: true,
      per_page: 40,
    },
  };
  try {
    // 'try' incearca sa execute solicitarea HTTP si sa gestionezze
    // orice eroare care apare
    options.params.q = query;
    options.params.page = currentPage;

    const response = await axios.get(
      PIXABAY_URL,
      options
      // parametrii trimisi impreuna cu solicitarea HTTP. Parametrii
      // sunt specificati in doc API-ului Pixabay
    );
    // verifica daca sunt imaginii
    if (response.data.hits.length === 0) {
      return null;
    }
    // Daca sunt gasite imagini functia returneaza img sub forma unui
    // array de obiecte
    return response.data.hits;
    // se executa catch daca apare o eroare in timpul solicitarii HTTP.
    // eroarea este afisata in consola si utilizatorul primeste notif err
  } catch (error) {
    console.error('Error fetching data: ', error);
  }
}

// primeste ca argument un obiect - hit si returneaza un sablon HTML sub
// forma de string, care reprezinta un card de img pt fiecare hit (sau rezultat)
// primit
function createImageCard(hit) {
  return `
    <div class="photo-card">
      <a href="${hit.largeImageURL}" data-lightbox="gallery">
        <img src="${hit.webformatURL}" alt="${hit.tags}" loading="lazy" />
      </a>
      <div class="info">
        <p class="info-item"><b>Likes</b> ${hit.likes}</p>
        <p class="info-item"><b>Views</b> ${hit.views}</p>
        <p class="info-item"><b>Comments</b> ${hit.comments}</p>
        <p class="info-item"><b>Downloads</b> ${hit.downloads}</p>
      </div>
    </div>
  `;
}
// functia primeste parametrul images = un array de obiecte, fiecare
// reprezentant o img
function updateGallery(images) {
  const markup = images.map(hit => createImageCard(hit)).join('');
  //transforma fiecare elem din array ul images (fiecare elem este un 'hit')
  //folosind functs createImageCard. funct createImageCard returneaza un
  //string HTML pentru fiecare img. Toate aceste string uri sunt unite cu join
  //iar stringul complet este stocat in markup.
  galleryDiv.innerHTML += markup; //adauga markup la continutul galleryDiv
  lightbox = new SimpleLightbox('.gallery a', {});
  lightbox.refresh();

  //Gestioneaza derularea automata a pag dupa ce noi img au fost adaugate
  //in galerie
  if (galleryDiv.firstElementChild) {
    const { height: cardHeight } =
      galleryDiv.firstElementChild.getBoundingClientRect();
    window.scrollBy({
      top: cardHeight * 2,
      behavior: 'smooth',
    });
  }
}
//gestionarea formularului
searchForm.addEventListener('submit', async e => {
  e.preventDefault();
  //Extrage val introdusa de utilizator in campul de cautare al form, elimina
  //spatiile albe de la inceput si sfarsit (.trim) si o atribuie searchQuery
  searchQuery = e.currentTarget.elements.searchQuery.value.trim();

  //verifica daca searchQuery este gol
  if (!searchQuery) {
    Notiflix.Notify.warning('Please enter a search term.');
    return;
  }

  currentPage = 1; //ca sa inceapa cautarea de la pag 1
  galleryDiv.innerHTML = ''; //sterge continutul actual al div ului galeriei
  //pregatindu-l pentru afisarea noilor rezultate de cautare

  //apeleaza fnctia asincrona fetchImages si returneaza rezultatele de la API
  const data = await fetchImages(searchQuery, currentPage);

  //verifica daca s-au gasit img, daca nu, afiseaza msg
  if (data === null) {
    Notiflix.Notify.failure(
      'Sorry, there are no images matching your search query. Please try again!'
    );
    loadMoreBtn.style.display = 'none';
    return;
  }
  // Afișează notificarea cu numărul total de imagini găsite

  updateGallery(data);
  loadMoreBtn.style.display = 'none';
});

// Butonul de load more (nu mai este nevoie de el pt ca avem infinite scroll)
loadMoreBtn.addEventListener('click', async () => {
  currentPage += 1;
  const data = await fetchImages(searchQuery, currentPage);

  if (data === null) {
    Notiflix.Notify.failure('No more images to load.');
    loadMoreBtn.style.display = 'none';
    return;
  }
  updateGallery(data);
});

loadMoreBtn.style.display = 'none';

// Infinite Scrolling Logic / incarca automat mai multe img cand utilizatorul
// deruleaza in josul paginii
window.addEventListener('scroll', async () => {
  // daca isEndOfResults este adevarat, inseamna ca toate rez disponibile
  // au fost deja incarcate, si nu mai este necesar sa se faca alte solicitari
  if (
    isEndOfResults ||
    //verifica daca utilizatorul a derulat destul de jos pe pag pt a declansa
    //incarcarea urm paag de img. Window.innerheight = inaltimea vizibila
    //a ferestrei browserului, window.scrollY = cat de mult s-a derulat.
    //document.body.offsetHeight = inaltimea totala a continutul pag.
    window.innerHeight + window.scrollY < document.body.offsetHeight - 100
  ) {
    //daca nu s-a derulat sufucient functia se incheie
    return;
  }

  currentPage += 1;
  const data = await fetchImages(searchQuery, currentPage); //apeleaza
  //funcția fetchImages cu termenul de căutare curent și numărul paginii
  //actualizat pentru a obține următoarea serie de imagini.

  //Verifica daca nu exista date sau lungimea datelor este 0, ceea ce
  //inseamna ca nu mai sunt ig de incarcat.
  if (!data || data.length === 0) {
    if (!isEndOfResults) {
      Notiflix.Notify.info(
        "We're sorry, but you've reached the end of search results."
      );
      isEndOfResults = true;
    }
    loadMoreBtn.style.display = 'none';
    return;
  }
  updateGallery(data);
});

// scroll up btn
window.onscroll = function () {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    backToFormBtn.style.display = 'block';
  } else {
    backToFormBtn.style.display = 'none';
  }
};

backToFormBtn.onclick = function () {
  searchForm.scrollIntoView({ behavior: 'smooth' });
};
