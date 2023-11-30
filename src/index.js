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
      q: query, //termenul de cautare introdus de utilizator
      image_type: 'photo', // tipul de img solicitate
      orientation: 'horizontal',
      page: currentPage, //nr paginii curente pentru paginare
      safesearch: true, //filtrul de continut sigur
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
    // Verifică dacă nu sunt găsite imagini sau dacă numărul total de imagini
    // este mai mic sau egal cu produsul dintre numărul paginii curente și
    // numărul de imagini pe pagină. Aceasta indică faptul că s-au atins toate
    // rezultatele posibile sau nu sunt rezultate
    console.log(response.data);
    if (
      response.data.hits.length === 0 ||
      response.data.totalHits <= currentPage * 40
    ) {
      isEndOfResults = true; // Setează flag-ul că s-au atins toate rezultatele
      return { hits: null, totalHits: response.data.totalHits };
    } // Returnează un obiect gol pentru 'hits' și numărul total de imagini

    // Daca sunt gasite imagini functia returneaza img sub forma unui
    // array de obiecte
    return { hits: response.data.hits, totalHits: response.data.totalHits };
    // se executa catch daca apare o eroare in timpul solicitarii HTTP.
    // eroarea este afisata in consola si utilizatorul primeste notif err
  } catch (error) {
    console.error('Error fetching data: ', error);
    isEndOfResults = true;
    return { hits: null, totalHits: 0 }; // Returnează un obiect cu valori nule în caz de eroare
  }
}

// primeste ca argument un obiect - hit si returneaza un sablon HTML sub
// forma de string, care reprezinta un card de img pt fiecare hit (sau rezultat)
// primit
function createImageCard(hit) {
  // Utilizează template literals pentru a crea un string HTML.
  // Fiecare card de imagine va conține:
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

// actualizeaza galeria de img. Primeste 'images' care este un array de ob,
// fiecare reprezentand o img (hit) returnata de API
function updateGallery(images) {
  const markup = images.map(hit => createImageCard(hit)).join('');
  //transforma fiecare elem din array ul images (fiecare elem este un 'hit')
  //folosind functs createImageCard. funct createImageCard returneaza un
  //string HTML pentru fiecare img. Toate aceste string uri sunt unite cu join
  //iar stringul complet este stocat in markup.
  galleryDiv.innerHTML += markup; //adauga markup la continutul galleryDiv

  //initializeaza/actualizeaza libraria SimpleLightbox pentru a include
  //nouile linkuri
  lightbox = new SimpleLightbox('.gallery a', {});
  lightbox.refresh();

  //Gestioneaza derularea automata a pag dupa ce noi img au fost adaugate
  //in galerie
  if (galleryDiv.firstElementChild) {
    const { height: cardHeight } =
      galleryDiv.firstElementChild.getBoundingClientRect(); //obtine inaltimea primului elem din galerie
    // Derulează pagina în jos cu o valoare egală cu dublul înălțimii unui card
    window.scrollBy({
      top: cardHeight / 3,
      behavior: 'smooth',
    });
  }
}

// Gestionarea formularului
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

  // Resetarea variabilelor pentru o nouă căutare
  currentPage = 1; //ca sa inceapa cautarea de la pag 1
  isEndOfResults = false; // Resetarea stării de sfârșit al rezultatelor
  isMessageDisplayed = false; // Resetarea stării pentru afișarea mesajului de sfârșit al rezultatelor
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

  // Dacă sunt găsite imagini, afișează un mesaj de succes cu numărul
  // total de imagini găsite.
  Notiflix.Notify.success(`Hooray! We found ${totalHits} images.`);

  // Actualizează galeria cu noile imagini.
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

// Infinite Scrolling Logic // se aplica de fiecare data cand utilizatorul
// deruleaza pagina
window.addEventListener('scroll', async () => {
  // Verifică dacă utilizatorul a derulat aproape de sfârșitul paginii.
  // 'window.innerHeight + window.scrollY' reprezintă distanța derulată
  // plus înălțimea ferestrei, iar 'document.body.offsetHeight' este
  // înălțimea totală a conținutului paginii.
  if (
    // Verifică dacă sfârșitul paginii este aproape
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 &&
    !isEndOfResults // Și dacă nu s-a atins sfârșitul rezultatelor
  ) {
    currentPage += 1;

    // Apel asincron către funcția fetchImages pentru a obține următoarea
    // serie de imagini.
    const { hits, totalHits } = await fetchImages(searchQuery, currentPage);

    // Verifică dacă sunt disponibile imagini noi de încărcat.
    if (!hits) {
      // Dacă nu sunt imagini noi, setează starea de sfârșit al rezultatelor.
      isEndOfResults = true;
      // Verifică dacă un mesaj de sfârșit nu a fost deja afișat
      if (!isMessageDisplayed) {
        Notiflix.Notify.info(
          "We're sorry, but you've reached the end of search results."
        );
        isMessageDisplayed = true; // Marchează că mesajul a fost afișat
      }
      return; // Încheie execuția funcției aici, deoarece nu mai sunt imagini de încărcat
    }

    // Dacă sunt disponibile imagini noi, actualizează galeria cu acestea.
    updateGallery(hits);
  }
});

// Scroll up btn - se activeaza la orice scroll
window.onscroll = function () {
  // Verifică dacă s-a derulat în pagină mai mult de 20px.
  // 'document.body.scrollTop' este folosit pentru unele browsere, iar
  // 'document.documentElement.scrollTop' pentru altele.
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    backToFormBtn.style.display = 'block'; // Afișează butonul
  } else {
    backToFormBtn.style.display = 'none'; // Ascunde butonul
  }
};

// Acest listener de evenimente este atașat la butonul de revenire în
// susul paginii(backToFormBtn).Când acest buton este apăsat, va declanșa
// acțiunea definită în interior.
backToFormBtn.onclick = function () {
  // Face ca formularul de căutare să devină vizibil în partea de sus a
  // paginii. 'scrollIntoView' derulează documentul până când elementul
  // specificat (în acest caz, searchForm) este în vizor.
  searchForm.scrollIntoView({ behavior: 'smooth' });
};
