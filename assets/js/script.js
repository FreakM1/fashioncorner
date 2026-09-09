document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('is-open');
  nav.classList.toggle('is-open');
});
nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuToggle.classList.remove('is-open');
    nav.classList.remove('is-open');
  });
});

// Wishlist toggle on product cards
document.querySelectorAll('.wishlist').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('is-active');
    const icon = btn.querySelector('i');
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
  });
});

// Back to top button
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('is-visible', window.scrollY > 500);
});
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Newsletter form
const newsletterForm = document.getElementById('newsletterForm');
const newsletterMsg = document.getElementById('newsletterMsg');
newsletterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  newsletterMsg.textContent = 'Obrigado! Você foi cadastrado com sucesso.';
  newsletterForm.reset();
});
