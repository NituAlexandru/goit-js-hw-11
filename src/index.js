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
let isMessageDisplayed = false;

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
      q: query,
      image_type: 'photo',
      orientation: 'horizontal',
      page: currentPage,
      safesearch: true,
      per_page: 40,
    },
  };
  try {
    // 'try' incearca sa execute solicitarea HTTP si sa gestionezze
    // orice eroare care apare

    const response = await axios.get(
      PIXABAY_URL,
      options
      // parametrii trimisi impreuna cu solicitarea HTTP. Parametrii
      // sunt specificati in doc API-ului Pixabay
    );
    // verifica daca sunt imaginii
    if (
      response.data.hits.length === 0 ||
      response.data.totalHits <= currentPage * 40
    ) {
      isEndOfResults = true;
      return { hits: null, totalHits: response.data.totalHits };
    }

    // Daca sunt gasite imagini functia returneaza img sub forma unui
    // array de obiecte
    return { hits: response.data.hits, totalHits: response.data.totalHits };
    // se executa catch daca apare o eroare in timpul solicitarii HTTP.
    // eroarea este afisata in consola si utilizatorul primeste notif err
  } catch (error) {
    console.error('Error fetching data: ', error);
    isEndOfResults = true;
    return { hits: null, totalHits: 0 };
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
  const { hits, totalHits } = await fetchImages(searchQuery, currentPage);

  //verifica daca s-au gasit img, daca nu, afiseaza msg
  if (hits === null || hits.length === 0) {
    Notiflix.Notify.failure(
      'Sorry, there are no images matching your search query. Please try again!'
    );
    loadMoreBtn.style.display = 'none';
    return;
  }
  Notiflix.Notify.success(`Hooray! We found ${totalHits} images.`);

  updateGallery(hits);
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

// Infinite Scrolling Logic
window.addEventListener('scroll', async () => {
  if (
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 &&
    !isEndOfResults
  ) {
    currentPage += 1;
    const { hits, totalHits } = await fetchImages(searchQuery, currentPage);

    if (!hits) {
      isEndOfResults = true;
      if (!isMessageDisplayed) {
        Notiflix.Notify.info(
          "We're sorry, but you've reached the end of search results."
        );
        isMessageDisplayed = true;
      }
      return;
    }

    updateGallery(hits);
  }
});

// Scroll up btn
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
