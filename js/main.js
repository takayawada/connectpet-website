// News data
const newsData = [
	{
		date: "2026.05.15",
		category: "お知らせ",
		title: "新しい保護猫カフェがオープンしました",
		content:
			"東京都渋谷区に新しい保護猫カフェ「Connect Cat Cafe」がオープンしました。",
	},
	{
		date: "2026.05.10",
		category: "イベント",
		title: "保護猫譲渡会を開催します",
		content:
			"5月25日（日）に保護猫譲渡会を開催します。事前予約制となっております。",
	},
	{
		date: "2026.05.01",
		category: "お知らせ",
		title: "ホームケアサービスの対応エリアを拡大",
		content:
			"神奈川県・埼玉県の一部地域にホームケアサービスの対応エリアを拡大しました。",
	},
	{
		date: "2026.04.20",
		category: "サービス",
		title: "新商品「キャットタワープレミアム」販売開始",
		content:
			"ケアストアにて新商品の販売を開始しました。オンラインでもご購入いただけます。",
	},
	{
		date: "2026.04.15",
		category: "お知らせ",
		title: "ゴールデンウィーク期間中の営業について",
		content: "ゴールデンウィーク期間中も通常営業いたします。",
	},
];

// Mobile menu toggle
document.addEventListener("DOMContentLoaded", () => {
	const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
	const navLinks = document.querySelector(".nav-links");

	if (mobileMenuBtn) {
		mobileMenuBtn.addEventListener("click", () => {
			navLinks.classList.toggle("active");
		});
	}

	// Load news if on news page
	if (document.getElementById("news-container")) {
		loadNews();
	}

	// GSAP animations
	initAnimations();
});

// Load news function
function loadNews() {
	const newsContainer = document.getElementById("news-container");
	if (!newsContainer) return;

	newsContainer.innerHTML = "";

	newsData.forEach((news, index) => {
		const newsItem = document.createElement("div");
		newsItem.className = "news-item";
		newsItem.style.opacity = "0";
		newsItem.innerHTML = `
      <div class="news-date">
        ${news.date}
        <span class="news-category">${news.category}</span>
      </div>
      <h3>${news.title}</h3>
      <p>${news.content}</p>
    `;
		newsContainer.appendChild(newsItem);

		// Animate news items
		if (typeof gsap !== "undefined") {
			gsap.to(newsItem, {
				opacity: 1,
				y: 0,
				duration: 0.5,
				delay: index * 0.1,
				ease: "power2.out",
			});
		} else {
			newsItem.style.opacity = "1";
		}
	});
}

// GSAP animations
function initAnimations() {
	if (typeof gsap === "undefined") return;

	// Cat animation
	const catAnimation = document.querySelector(".cat-animation");
	if (catAnimation) {
		gsap.to(catAnimation, {
			y: -20,
			duration: 2,
			repeat: -1,
			yoyo: true,
			ease: "power1.inOut",
		});

		gsap.to(catAnimation, {
			rotation: 10,
			duration: 1.5,
			repeat: -1,
			yoyo: true,
			ease: "power1.inOut",
		});
	}

	// Fade in cards on scroll
	const cards = document.querySelectorAll(".card");
	if (cards.length > 0) {
		gsap.from(cards, {
			scrollTrigger: {
				trigger: cards[0].parentElement,
				start: "top 80%",
			},
			opacity: 0,
			y: 50,
			duration: 0.8,
			stagger: 0.2,
			ease: "power2.out",
		});
	}

	// Hero animation
	const heroTitle = document.querySelector(".hero h1");
	const heroText = document.querySelector(".hero p");
	const heroButton = document.querySelector(".hero .cta-button");

	if (heroTitle) {
		gsap.from(heroTitle, {
			opacity: 0,
			y: 30,
			duration: 1,
			ease: "power2.out",
		});
	}

	if (heroText) {
		gsap.from(heroText, {
			opacity: 0,
			y: 20,
			duration: 1,
			delay: 0.3,
			ease: "power2.out",
		});
	}

	if (heroButton) {
		gsap.from(heroButton, {
			opacity: 0,
			scale: 0.8,
			duration: 0.8,
			delay: 0.6,
			ease: "back.out(1.7)",
		});
	}
}

// Form submission handler
const contactForm = document.getElementById("contact-form");
if (contactForm) {
	contactForm.addEventListener("submit", (e) => {
		e.preventDefault();
		alert(
			"お問い合わせありがとうございます。担当者より折り返しご連絡させていただきます。",
		);
		contactForm.reset();
	});
}
