'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//! class  Application
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // get user's position
    this._getPosition();
    // get data from local storage
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMAp.bind(this),
        function () {
          alert('could not get your position');
        }
      );
    }
  }
  _loadMAp(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    // handling clicks on map

    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPostivie = (...inputs) => inputs.every(inp => inp > 0);

    //!get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //!if activity running create running object

    if (type === 'running') {
      const cadence = +inputCadence.value;

      //! check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPostivie(distance, duration, cadence)
      )
        return alert('input have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //! if workout cycling create cycling object

      if (
        !validInputs(distance, duration, elevation) ||
        !allPostivie(distance, duration)
      )
        return alert('input have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //! add new object to workout array
    this.#workouts.push(workout);

    //! render workout on map as marker
    this._renderWorkoutMarker(workout);
    //! render workout on list
    this._renderWorkout(workout);

    //! clear input fields
    this._hideForm();

    //! set local storage at all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}  ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <span class="btnDelete">x</span>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
      <span class="workout__icon">${workout.pace.toFixed(1)}</span>
      <span class="workout__value">4.6</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${workout.cedence}</span>
      <span class="workout__value">178</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">${workout.speed.toFixed(1)}</span>
      <span class="workout__value">16</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _deleteItem(indexDelete) {
    const updatEdRenderWorouts = this.#workouts.filter((workout, index) => {
      return index !== indexDelete;
    });
    console.log(updatEdRenderWorouts);

    this.#workouts = updatEdRenderWorouts;
    localStorage.setItem('workouts', JSON.stringify(updatEdRenderWorouts));
    location.reload();
  }
  _moveToPopup(e) {
    const workoutEL = e.target.closest('.workout');

    if (!workoutEL) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEL.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //! using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
    const deleteButton = document.querySelectorAll('.btnDelete');

    if (deleteButton !== null) {
      deleteButton.forEach((buttonDelete, index) => {
        buttonDelete.addEventListener('click', e => {
          this._deleteItem(index);
        });
      });
    }
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
//! class workout
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,kng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}
//! class running
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cedence) {
    super(coords, distance, duration);
    this.cedence = cedence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

//! class cycling
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 5.2, 24, 178);
// console.log(run1);
// console.log(cycle1);

const app = new App();
