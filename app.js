/* ----------------------------------------------------
   NutriFit — Core Application Logic & State Engine
   ---------------------------------------------------- */

// --- Global Application State ---
const APP_STATE = {
    theme: 'dark',
    currentStep: 1,
    units: 'metric', // 'metric' or 'imperial'
    userProfile: {
        gender: 'male',
        age: 25,
        weight: 70, // always saved in kg internally
        height: 175, // always saved in cm internally
        activityMultiplier: 1.2,
        goal: 'lose', // 'lose', 'maintain', 'gain'
        dietPreference: 'balanced' // 'balanced', 'highprotein', 'lowcarb', 'vegetarian', 'vegan'
    },
    analytics: {
        bmi: 22.9,
        bmiStatus: 'Normal Weight',
        bmr: 1540,
        tdee: 2387,
        targetCalories: 1887,
        macros: {
            carbs: 0,
            protein: 0,
            fats: 0
        }
    },
    currentDay: 0, // Day 0 to 6
    // Active 7-day meal plan. Each index (0-6) holds an object with: breakfast, lunch, dinner, snack
    activeMealPlan: []
};

// --- Macronutrient Splitting Strategies ---
// Keyed by diet type. Values are percentages of total calories for [Carbs, Protein, Fats]
const MACRO_SPLITS = {
    balanced: { carbs: 0.50, protein: 0.20, fats: 0.30 },
    highprotein: { carbs: 0.35, protein: 0.35, fats: 0.30 },
    lowcarb: { carbs: 0.10, protein: 0.30, fats: 0.60 },
    vegetarian: { carbs: 0.55, protein: 0.15, fats: 0.30 },
    vegan: { carbs: 0.60, protein: 0.15, fats: 0.25 }
};

// --- Comprehensive Meal Database (Meal Swapper Pool) ---
// Each type has multiple options. A meal is dynamically computed to match calorie scale targets.
const MEAL_DATABASE = {
    balanced: {
        breakfast: [
            { name: "Creamy Berry Oatmeal", ingredients: ["Rolled Oats (60g)", "Almond Milk (200ml)", "Mixed Berries (50g)", "Chia Seeds (10g)", "Honey (1 tbsp)"], c: 0.20, p: 0.15, f: 0.15 },
            { name: "Avocado Egg Toast", ingredients: ["Whole Wheat Bread (2 slices)", "Eggs (2 large)", "Avocado (1/2 fruit)", "Cherry Tomatoes (4)", "Salt & Black Pepper"], c: 0.22, p: 0.18, f: 0.20 },
            { name: "Greek Yogurt Parfait", ingredients: ["Greek Yogurt (200g)", "Granola (40g)", "Sliced Strawberries (60g)", "Walnuts (15g)", "Maple Syrup (1 tsp)"], c: 0.18, p: 0.20, f: 0.12 },
            { name: "Banana Spinach Smoothie", ingredients: ["Banana (1 medium)", "Spinach (1 cup)", "Whey Protein (1 scoop)", "Peanut Butter (1 tbsp)", "Milk (150ml)"], c: 0.25, p: 0.22, f: 0.18 }
        ],
        lunch: [
            { name: "Mediterranean Quinoa Bowl", ingredients: ["Quinoa cooked (150g)", "Grilled Chicken (120g)", "Cucumber (1/2)", "Feta Cheese (30g)", "Olive Oil Dressing (1 tbsp)"], c: 0.30, p: 0.35, f: 0.25 },
            { name: "Turkey Avocado Wrap", ingredients: ["Whole Wheat Tortilla (1)", "Sliced Turkey Breast (100g)", "Avocado (1/2)", "Spinach Leaves", "Light Mayonnaise (1 tbsp)"], c: 0.28, p: 0.32, f: 0.22 },
            { name: "Tuna Salad Salad", ingredients: ["Canned Tuna in water (150g)", "Mixed Greens (2 cups)", "Sweet Corn (50g)", "Olive Oil (1 tbsp)", "Lemon Juice"], c: 0.25, p: 0.38, f: 0.24 },
            { name: "Sweet Potato & Beef Salad", ingredients: ["Roasted Sweet Potato (120g)", "Lean Ground Beef (120g)", "Bell Peppers (1)", "Olive Oil (1 tsp)", "Green Onions"], c: 0.32, p: 0.34, f: 0.26 }
        ],
        dinner: [
            { name: "Baked Salmon with Asparagus", ingredients: ["Salmon Fillet (150g)", "Asparagus (100g)", "Brown Rice (120g)", "Olive Oil (1 tbsp)", "Lemon & Dill"], c: 0.32, p: 0.38, f: 0.32 },
            { name: "Garlic Butter Shrimp Stir-Fry", ingredients: ["Shrimp (150g)", "Broccoli Florets (150g)", "Jasmine Rice (120g)", "Garlic Butter (1.5 tbsp)", "Soy Sauce"], c: 0.35, p: 0.36, f: 0.30 },
            { name: "Lean Sirloin & Roasted Veggies", ingredients: ["Sirloin Steak (130g)", "Red Potatoes (100g)", "Zucchini (1 medium)", "Olive Oil (1 tbsp)"], c: 0.30, p: 0.40, f: 0.32 },
            { name: "Herb Roasted Chicken Breast", ingredients: ["Chicken Breast (150g)", "Quinoa (100g)", "Roasted Brussels Sprouts (80g)", "Butter (1 tsp)"], c: 0.33, p: 0.42, f: 0.28 }
        ],
        snack: [
            { name: "Almonds & Apple", ingredients: ["Almonds (25g)", "Red Apple (1 medium)"], c: 0.10, p: 0.05, f: 0.12 },
            { name: "Hummus & Carrot Sticks", ingredients: ["Hummus (3 tbsp)", "Carrots (2 medium)"], c: 0.12, p: 0.04, f: 0.10 },
            { name: "Cottage Cheese & Peaches", ingredients: ["Low Fat Cottage Cheese (150g)", "Sliced Peaches (50g)"], c: 0.08, p: 0.15, f: 0.08 },
            { name: "Dark Chocolate & Rice Cakes", ingredients: ["Brown Rice Cakes (2)", "Dark Chocolate 85% (20g)"], c: 0.14, p: 0.03, f: 0.10 }
        ]
    },
    highprotein: {
        breakfast: [
            { name: "Power Protein Scramble", ingredients: ["Whole Eggs (3)", "Egg Whites (2)", "Spinach (1 cup)", "Turkey Bacon (2 slices)", "Feta Cheese (20g)"], c: 0.10, p: 0.42, f: 0.28 },
            { name: "Whey Protein Oats", ingredients: ["Rolled Oats (50g)", "Whey Protein (1.5 scoops)", "Blueberries (40g)", "Almonds (10g)"], c: 0.25, p: 0.40, f: 0.15 },
            { name: "Greek Yogurt Berry Bliss", ingredients: ["Greek Yogurt 0% (250g)", "Whey Protein (1/2 scoop)", "Chia Seeds (10g)", "Raspberries (50g)"], c: 0.15, p: 0.44, f: 0.10 },
            { name: "Smoked Salmon & Egg White Toast", ingredients: ["Ezekiel Bread (1 slice)", "Egg Whites scrambled (4)", "Smoked Salmon (60g)", "Dill"], c: 0.18, p: 0.45, f: 0.12 }
        ],
        lunch: [
            { name: "Double Chicken Fit Bowl", ingredients: ["Grilled Chicken Breast (200g)", "Brown Rice (80g)", "Steamed Broccoli (100g)", "Sesame Oil (1 tsp)"], c: 0.22, p: 0.52, f: 0.18 },
            { name: "High-Protein Tuna Salad Wrap", ingredients: ["High-Fiber Wrap (1)", "Canned Tuna (180g)", "Light Greek Yogurt Mayo (2 tbsp)", "Celery diced"], c: 0.20, p: 0.48, f: 0.16 },
            { name: "Turkey Burger & Greens", ingredients: ["Lean Turkey Patty (180g)", "Mixed Green Salad (2 cups)", "Avocado (1/4)", "Light Dressing (1 tbsp)"], c: 0.15, p: 0.46, f: 0.22 },
            { name: "Beef & Quinoa Powerhouse", ingredients: ["Lean Ground Beef (160g)", "Quinoa (80g)", "Green Beans (100g)"], c: 0.24, p: 0.48, f: 0.24 }
        ],
        dinner: [
            { name: "Pan Seared Cod & Quinoa", ingredients: ["Cod Fillet (200g)", "Quinoa (80g)", "Asparagus spears (120g)", "Olive Oil (1 tsp)"], c: 0.22, p: 0.50, f: 0.16 },
            { name: "High Protein Beef Sirloin", ingredients: ["Lean Sirloin Steak (180g)", "Mashed Sweet Potatoes (100g)", "Roasted Broccoli (80g)"], c: 0.24, p: 0.54, f: 0.26 },
            { name: "Sesame Baked Salmon Fillet", ingredients: ["Salmon Fillet (180g)", "Brown Rice (80g)", "Snap Peas (80g)", "Soy-Ginger Glaze"], c: 0.25, p: 0.48, f: 0.32 },
            { name: "Garlic Roasted Chicken Breast", ingredients: ["Chicken Breast (200g)", "Roasted Potatoes (100g)", "Zucchini (100g)", "Olive Oil (1 tsp)"], c: 0.26, p: 0.52, f: 0.20 }
        ],
        snack: [
            { name: "Whey Shake & Almonds", ingredients: ["Whey Protein (1.5 scoops)", "Almonds (15g)", "Water/Ice"], c: 0.05, p: 0.35, f: 0.10 },
            { name: "High Protein Cottage Cheese", ingredients: ["Cottage Cheese 2% (200g)", "Walnuts (10g)"], c: 0.06, p: 0.26, f: 0.12 },
            { name: "Beef Jerky & Celery Sticks", ingredients: ["Lean Beef Jerky (40g)", "Celery Sticks (4)"], c: 0.04, p: 0.28, f: 0.04 },
            { name: "Hard Boiled Eggs", ingredients: ["Hard Boiled Eggs (2 large)", "Egg Whites (2 large)"], c: 0.02, p: 0.24, f: 0.10 }
        ]
    },
    lowcarb: {
        breakfast: [
            { name: "Keto Bacon & Egg Plate", ingredients: ["Eggs (3 large)", "Streaky Bacon (3 slices)", "Spinach cooked in butter (1 cup)", "Avocado (1/2 fruit)"], c: 0.05, p: 0.28, f: 0.48 },
            { name: "Bulletproof Keto Shake", ingredients: ["Unsweetened Coconut Milk (250ml)", "MCT Oil (1 tbsp)", "Peanut Butter (1.5 tbsp)", "Whey Protein (1 scoop)"], c: 0.04, p: 0.25, f: 0.44 },
            { name: "Smoked Salmon Cream Cheese Rolls", ingredients: ["Smoked Salmon (100g)", "Full Fat Cream Cheese (40g)", "Cucumber Slices (8)"], c: 0.06, p: 0.24, f: 0.40 },
            { name: "Sausage & Mushroom Scramble", ingredients: ["Pork Sausage (2 links)", "Eggs (2)", "Button Mushrooms (50g)", "Butter (1 tbsp)"], c: 0.05, p: 0.26, f: 0.45 }
        ],
        lunch: [
            { name: "Keto Chicken Cobb Salad", ingredients: ["Chicken Breast (150g)", "Streaky Bacon (1 slice)", "Hard Boiled Egg (1)", "Blue Cheese (25g)", "Avocado (1/2)", "Olive Oil Dressing (1.5 tbsp)"], c: 0.08, p: 0.38, f: 0.52 },
            { name: "Cheesy Bacon Bunless Burger", ingredients: ["Beef Patty 20% fat (150g)", "Cheddar Cheese (2 slices)", "Bacon (1 slice)", "Romaine Lettuce Wrap", "Mayonnaise (1 tbsp)"], c: 0.05, p: 0.36, f: 0.55 },
            { name: "Tuna Avocado Salad Boats", ingredients: ["Canned Tuna in Olive Oil (160g)", "Avocado (1 large)", "Celery chopped", "Mayonnaise (1.5 tbsp)"], c: 0.06, p: 0.32, f: 0.50 },
            { name: "Philly Cheesesteak Lettuce Bowl", ingredients: ["Shaved Ribeye Steak (150g)", "Provolone Cheese (2 slices)", "Bell Peppers (1/2)", "Butter (1 tbsp)"], c: 0.08, p: 0.34, f: 0.48 }
        ],
        dinner: [
            { name: "Creamy Garlic Butter Salmon", ingredients: ["Salmon Fillet (180g)", "Heavy Whipping Cream (40ml)", "Garlic Butter (1.5 tbsp)", "Zucchini Noodles (150g)"], c: 0.08, p: 0.36, f: 0.56 },
            { name: "Ribeye Steak with Blue Cheese", ingredients: ["Ribeye Steak (180g)", "Blue Cheese Butter (25g)", "Sauteed Spinach in Olive Oil (1 cup)"], c: 0.04, p: 0.40, f: 0.60 },
            { name: "Garlic Parmesan Pork Chops", ingredients: ["Pork Chops (160g)", "Grated Parmesan (30g)", "Broccoli Florets roasted (100g)", "Olive Oil (1.5 tbsp)"], c: 0.08, p: 0.38, f: 0.50 },
            { name: "Keto Butter Chicken", ingredients: ["Chicken Thighs (150g)", "Tomato Paste (1 tbsp)", "Butter (1.5 tbsp)", "Heavy Cream (50ml)", "Cauliflower Rice (120g)"], c: 0.09, p: 0.32, f: 0.52 }
        ],
        snack: [
            { name: "Macadamia Nuts & Cheese", ingredients: ["Macadamia Nuts (30g)", "Sharp Cheddar Cubes (30g)"], c: 0.04, p: 0.08, f: 0.30 },
            { name: "Pumpkin Seeds & Avocado", ingredients: ["Spiced Pumpkin Seeds (25g)", "Avocado (1/2 fruit)"], c: 0.05, p: 0.07, f: 0.24 },
            { name: "Pork Rinds & Guacamole", ingredients: ["Pork Rinds (30g)", "Guacamole (3 tbsp)"], c: 0.04, p: 0.12, f: 0.22 },
            { name: "Celery Sticks & Cream Cheese", ingredients: ["Celery Sticks (4)", "Cream Cheese (40g)"], c: 0.03, p: 0.04, f: 0.18 }
        ]
    },
    vegetarian: {
        breakfast: [
            { name: "High-Protein Tofu Scramble", ingredients: ["Firm Tofu (150g)", "Turmeric & Nutritional Yeast", "Spinach (1 cup)", "Whole Wheat Toast (2 slices)", "Avocado (1/4)"], c: 0.25, p: 0.18, f: 0.14 },
            { name: "Almond Butter Blueberry Toast", ingredients: ["Ezekiel Bread (2 slices)", "Almond Butter (2 tbsp)", "Fresh Blueberries (50g)", "Chia Seeds (10g)"], c: 0.28, p: 0.14, f: 0.18 },
            { name: "Vegetarian Shakshuka", ingredients: ["Eggs (2 large)", "Tomato Puree (150ml)", "Bell Peppers (1/2)", "Feta Cheese (20g)", "Sourdough Bread (1 slice)"], c: 0.22, p: 0.16, f: 0.15 },
            { name: "Cottage Cheese Fruit Melt", ingredients: ["Low Fat Cottage Cheese (200g)", "Honey (1 tbsp)", "Sliced Banana (1/2)", "Walnuts (15g)"], c: 0.26, p: 0.18, f: 0.12 }
        ],
        lunch: [
            { name: "Tempeh Quinoa Buddha Bowl", ingredients: ["Marinated Tempeh (120g)", "Quinoa cooked (120g)", "Roasted Sweet Potato (100g)", "Tahini Dressing (1 tbsp)", "Kale"], c: 0.38, p: 0.28, f: 0.20 },
            { name: "Black Bean Avocado Salad", ingredients: ["Black Beans canned (150g)", "Sweet Corn (80g)", "Avocado (1/2)", "Cherry Tomatoes (100g)", "Olive Oil Dressing (1 tbsp)"], c: 0.35, p: 0.18, f: 0.18 },
            { name: "Mediterranean Hummus Plate", ingredients: ["Hummus (4 tbsp)", "Whole Wheat Pita Bread (1)", "Feta Cheese (40g)", "Olives (6)", "Cucumber slices"], c: 0.32, p: 0.15, f: 0.22 },
            { name: "Lentil Vegetable Soup Bowl", ingredients: ["Brown Lentils cooked (150g)", "Mixed Veggies cooked (1.5 cups)", "Sourdough Toast (1 slice)", "Olive Oil (1 tsp)"], c: 0.36, p: 0.20, f: 0.10 }
        ],
        dinner: [
            { name: "Sweet Potato Chickpea Curry", ingredients: ["Chickpeas canned (150g)", "Roasted Sweet Potato (120g)", "Coconut Milk light (100ml)", "Brown Rice (120g)", "Curry Spices"], c: 0.44, p: 0.18, f: 0.18 },
            { name: "High-Protein Lentil Pasta", ingredients: ["Red Lentil Pasta cooked (120g)", "Marinara Sauce (120ml)", "Mushrooms & Zucchini (100g)", "Parmesan Cheese (20g)"], c: 0.42, p: 0.24, f: 0.12 },
            { name: "Paneer Roasted Veggie Bowl", ingredients: ["Paneer Cheese cubed (120g)", "Brown Rice (100g)", "Bell Peppers & Red Onion (1.5 cups)", "Ghee (1 tsp)"], c: 0.30, p: 0.22, f: 0.24 },
            { name: "Stuffed Bell Peppers", ingredients: ["Bell Peppers (2 large)", "Quinoa (80g)", "Black Beans (100g)", "Monterey Jack Cheese (30g)"], c: 0.38, p: 0.20, f: 0.16 },
        ],
        snack: [
            { name: "Greek Yogurt & Walnuts", ingredients: ["Plain Greek Yogurt (150g)", "Walnuts (20g)"], c: 0.08, p: 0.12, f: 0.12 },
            { name: "Chia Seed Pudding", ingredients: ["Chia Seeds (25g)", "Coconut Milk (120ml)", "Maple Syrup (1 tsp)"], c: 0.10, p: 0.04, f: 0.10 },
            { name: "Edamame in Pods", ingredients: ["Steamed Edamame (150g)", "Sea Salt"], c: 0.10, p: 0.12, f: 0.04 },
            { name: "Roasted Chickpeas", ingredients: ["Roasted Crunchy Chickpeas (40g)"], c: 0.16, p: 0.06, f: 0.04 }
        ]
    },
    vegan: {
        breakfast: [
            { name: "Superfood Oatmeal Bowl", ingredients: ["Rolled Oats (60g)", "Soy Milk (200ml)", "Chia Seeds (10g)", "Hemp Seeds (10g)", "Maple Syrup (1 tbsp)", "Berries"], c: 0.32, p: 0.14, f: 0.14 },
            { name: "Tofu Scramble & Avocado Toast", ingredients: ["Firm Tofu crumbled (120g)", "Spinach (1 cup)", "Whole Wheat Toast (2 slices)", "Avocado (1/2 fruit)"], c: 0.28, p: 0.16, f: 0.16 },
            { name: "Protein Power Smoothie", ingredients: ["Vegan Pea Protein (1.5 scoops)", "Banana (1 medium)", "Spinach", "Almond Butter (1 tbsp)", "Almond Milk (200ml)"], c: 0.30, p: 0.28, f: 0.12 },
            { name: "Coconut Yogurt Granola Cup", ingredients: ["Unsweetened Coconut Yogurt (200g)", "Vegan Granola (40g)", "Strawberries", "Flax Seeds (1 tbsp)"], c: 0.24, p: 0.08, f: 0.18 }
        ],
        lunch: [
            { name: "Tempeh Quinoa Power Salad", ingredients: ["Smoked Tempeh (120g)", "Quinoa cooked (120g)", "Mixed Baby Greens (2 cups)", "Walnuts (15g)", "Olive Oil & Lemon Dressing"], c: 0.36, p: 0.26, f: 0.20 },
            { name: "Chickpea Salad Wrap", ingredients: ["Whole Wheat Tortilla (1)", "Mashed Chickpeas (120g)", "Vegan Mayo (1 tbsp)", "Shredded Carrots & Lettuce"], c: 0.38, p: 0.14, f: 0.12 },
            { name: "Lentil Hummus Plate", ingredients: ["Brown Lentils cooked (100g)", "Hummus (3 tbsp)", "Pita Bread (1)", "Cucumber & Cherry Tomatoes"], c: 0.40, p: 0.16, f: 0.10 },
            { name: "Black Bean Mango Salad Bowl", ingredients: ["Black Beans (150g)", "Fresh Mango cubed (80g)", "Sweet Corn (50g)", "Cilantro-Lime Dressing"], c: 0.42, p: 0.14, f: 0.08 }
        ],
        dinner: [
            { name: "Tofu Sweet Potato Sheet Bake", ingredients: ["Extra Firm Tofu (150g)", "Sweet Potato cubed (150g)", "Broccoli Florets (100g)", "Tahini (1.5 tbsp)", "Olive Oil (1 tsp)"], c: 0.44, p: 0.22, f: 0.22 },
            { name: "Lentil Bolognese Pasta", ingredients: ["Brown Lentils cooked (150g)", "Chickpea Pasta cooked (100g)", "Marinara Sauce (150ml)", "Nutritional Yeast (1 tbsp)"], c: 0.46, p: 0.26, f: 0.08 },
            { name: "Edamame Jasmine Rice Stir Fry", ingredients: ["Shelled Edamame (120g)", "Jasmine Rice (120g)", "Stir-fry Veggies (150g)", "Sesame Oil (1 tbsp)", "Soy Sauce"], c: 0.40, p: 0.18, f: 0.14 },
            { name: "Vegan Black Bean Chili", ingredients: ["Black Beans canned (150g)", "Kidney Beans canned (100g)", "Tomato Sauce", "Brown Rice (100g)", "Avocado (1/4)"], c: 0.45, p: 0.18, f: 0.12 }
        ],
        snack: [
            { name: "Mixed Nuts & Dates", ingredients: ["Walnuts & Almonds (25g)", "Medjool Dates (2)"], c: 0.14, p: 0.04, f: 0.12 },
            { name: "Hummus & Pita Chips", ingredients: ["Hummus (3 tbsp)", "Baked Pita Chips (30g)"], c: 0.18, p: 0.05, f: 0.08 },
            { name: "Rice Cakes & Peanut Butter", ingredients: ["Brown Rice Cakes (2)", "Natural Peanut Butter (1 tbsp)"], c: 0.16, p: 0.06, f: 0.08 },
            { name: "Roasted Pumpkin Seeds", ingredients: ["Salted Pumpkin Seeds (30g)"], c: 0.08, p: 0.08, f: 0.12 }
        ]
    }
};

// --- Initializer & Setup Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMultiStepForm();
    initUnitSwitching();
    initSliderValueTrackers();
    initCalculationForm();
    initDietPlanModifiers();
    initGroceryAggregator();
});

// --- Theme Management System ---
function initTheme() {
    const themeBtn = document.getElementById("theme-toggle-btn");
    const savedTheme = localStorage.getItem("nutrifit-theme") || "dark";
    
    setTheme(savedTheme);

    themeBtn.addEventListener("click", () => {
        const nextTheme = APP_STATE.theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
    });
}

function setTheme(themeName) {
    document.documentElement.setAttribute("data-theme", themeName);
    APP_STATE.theme = themeName;
    localStorage.setItem("nutrifit-theme", themeName);
    
    // Update theme toggle icon
    const icon = document.querySelector("#theme-toggle-btn i");
    if (themeName === "light") {
        icon.className = "fa-solid fa-sun";
    } else {
        icon.className = "fa-solid fa-moon";
    }
}

// --- Multi-Step Form Navigation ---
function initMultiStepForm() {
    const form = document.getElementById("health-profiler-form");
    const steps = form.querySelectorAll(".form-step");
    const progressFill = document.querySelector(".step-progress-fill");
    const dots = document.querySelectorAll(".step-dot");
    
    // Next buttons
    form.querySelectorAll(".btn-next-step").forEach(btn => {
        btn.addEventListener("click", () => {
            if (validateStep(APP_STATE.currentStep)) {
                changeStep(APP_STATE.currentStep + 1);
            }
        });
    });

    // Prev buttons
    form.querySelectorAll(".btn-prev-step").forEach(btn => {
        btn.addEventListener("click", () => {
            changeStep(APP_STATE.currentStep - 1);
        });
    });

    // Direct Step Indicator Dot Clicking (only allowed to go backwards or to already visited steps)
    dots.forEach(dot => {
        dot.addEventListener("click", () => {
            const targetStep = parseInt(dot.getAttribute("data-step"));
            if (targetStep < APP_STATE.currentStep) {
                changeStep(targetStep);
            }
        });
    });

    function changeStep(newStep) {
        if (newStep < 1 || newStep > 3) return;
        
        // Update state
        APP_STATE.currentStep = newStep;
        
        // Hide all steps, show current step
        steps.forEach(step => {
            step.classList.remove("active");
            if (parseInt(step.getAttribute("data-step")) === newStep) {
                step.classList.add("active");
            }
        });

        // Update progress bar fill percentage
        const fillPercentage = ((newStep - 1) / 2) * 100;
        progressFill.style.width = `${Math.max(10, fillPercentage)}%`;

        // Update step dots classes
        dots.forEach(dot => {
            const dotStep = parseInt(dot.getAttribute("data-step"));
            dot.classList.remove("active", "completed");
            
            if (dotStep === newStep) {
                dot.classList.add("active");
            } else if (dotStep < newStep) {
                dot.classList.add("completed");
            }
        });
    }
}

// Simple Step Form Validation before advancing
function validateStep(stepNum) {
    if (stepNum === 1) {
        const ageInput = document.getElementById("input-age");
        const ageVal = parseInt(ageInput.value);
        if (isNaN(ageVal) || ageVal < 15 || ageVal > 100) {
            alert("Please enter a valid age between 15 and 100 years.");
            ageInput.focus();
            return false;
        }
    }
    if (stepNum === 2) {
        if (APP_STATE.units === 'imperial') {
            const ft = parseInt(document.getElementById("input-height-ft").value);
            const inch = parseInt(document.getElementById("input-height-in").value);
            if (isNaN(ft) || ft < 3 || ft > 8) {
                alert("Please enter a valid height in feet (3 to 8).");
                return false;
            }
            if (isNaN(inch) || inch < 0 || inch > 11) {
                alert("Please enter a valid height in inches (0 to 11).");
                return false;
            }
        }
    }
    return true;
}

// --- Unit Switching Engine ---
function initUnitSwitching() {
    const btnMetric = document.getElementById("btn-metric");
    const btnImperial = document.getElementById("btn-imperial");
    
    const weightMetricGroup = document.getElementById("weight-metric-group");
    const weightImperialGroup = document.getElementById("weight-imperial-group");
    const heightMetricGroup = document.getElementById("height-metric-group");
    const heightImperialGroup = document.getElementById("height-imperial-group");

    btnMetric.addEventListener("click", () => setUnitMode("metric"));
    btnImperial.addEventListener("click", () => setUnitMode("imperial"));

    function setUnitMode(mode) {
        if (APP_STATE.units === mode) return;
        APP_STATE.units = mode;

        if (mode === "metric") {
            btnMetric.classList.add("active");
            btnImperial.classList.remove("active");
            
            weightMetricGroup.classList.remove("hidden");
            weightImperialGroup.classList.add("hidden");
            heightMetricGroup.classList.remove("hidden");
            heightImperialGroup.classList.add("hidden");

            // Sync metric sliders values from current Imperial configurations
            const imperialLbs = parseFloat(document.getElementById("input-weight-imperial").value);
            const kgVal = Math.round(imperialLbs * 0.45359237 * 2) / 2; // round to nearest 0.5
            const sliderKg = document.getElementById("input-weight-metric");
            sliderKg.value = Math.max(30, Math.min(180, kgVal));
            document.getElementById("weight-metric-val").textContent = `${sliderKg.value} kg`;

            const ft = parseInt(document.getElementById("input-height-ft").value) || 0;
            const inch = parseInt(document.getElementById("input-height-in").value) || 0;
            const cmVal = Math.round(((ft * 12) + inch) * 2.54);
            const sliderCm = document.getElementById("input-height-metric");
            sliderCm.value = Math.max(100, Math.min(230, cmVal));
            document.getElementById("height-metric-val").textContent = `${sliderCm.value} cm`;

        } else {
            btnMetric.classList.remove("active");
            btnImperial.classList.add("active");
            
            weightMetricGroup.classList.add("hidden");
            weightImperialGroup.classList.remove("hidden");
            heightMetricGroup.classList.add("hidden");
            heightImperialGroup.classList.remove("hidden");

            // Sync imperial values from current Metric configurations
            const kgVal = parseFloat(document.getElementById("input-weight-metric").value);
            const lbsVal = Math.round(kgVal * 2.20462);
            const sliderLbs = document.getElementById("input-weight-imperial");
            sliderLbs.value = Math.max(66, Math.min(400, lbsVal));
            document.getElementById("weight-imperial-val").textContent = `${sliderLbs.value} lbs`;

            const cmVal = parseFloat(document.getElementById("input-height-metric").value);
            const totalInches = cmVal / 2.54;
            const ft = Math.floor(totalInches / 12);
            const inch = Math.round(totalInches % 12);
            document.getElementById("input-height-ft").value = Math.max(3, Math.min(8, ft));
            document.getElementById("input-height-in").value = Math.max(0, Math.min(11, inch));
        }
    }
}

// --- Sync Slider Handles Visual Labels ---
function initSliderValueTrackers() {
    const sliderWeightMetric = document.getElementById("input-weight-metric");
    const weightMetricLabel = document.getElementById("weight-metric-val");
    
    sliderWeightMetric.addEventListener("input", () => {
        weightMetricLabel.textContent = `${sliderWeightMetric.value} kg`;
    });

    const sliderWeightImperial = document.getElementById("input-weight-imperial");
    const weightImperialLabel = document.getElementById("weight-imperial-val");

    sliderWeightImperial.addEventListener("input", () => {
        weightImperialLabel.textContent = `${sliderWeightImperial.value} lbs`;
    });

    const sliderHeightMetric = document.getElementById("input-height-metric");
    const heightMetricLabel = document.getElementById("height-metric-val");

    sliderHeightMetric.addEventListener("input", () => {
        heightMetricLabel.textContent = `${sliderHeightMetric.value} cm`;
    });
}

// --- Math & Analytics Calculations Engine ---
function initCalculationForm() {
    const form = document.getElementById("health-profiler-form");
    
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        // Read form properties and update state
        const gender = form.querySelector("input[name='gender']:checked").value;
        const age = parseInt(document.getElementById("input-age").value);
        const activity = parseFloat(document.getElementById("input-activity").value);
        const goal = form.querySelector("input[name='fitness-goal']:checked").value;
        
        let weightKg = 0;
        let heightCm = 0;

        if (APP_STATE.units === 'metric') {
            weightKg = parseFloat(document.getElementById("input-weight-metric").value);
            heightCm = parseFloat(document.getElementById("input-height-metric").value);
        } else {
            const lbs = parseFloat(document.getElementById("input-weight-imperial").value);
            const ft = parseInt(document.getElementById("input-height-ft").value);
            const inch = parseInt(document.getElementById("input-height-in").value);
            
            weightKg = lbs * 0.45359237;
            heightCm = ((ft * 12) + inch) * 2.54;
        }

        // Save physiological profile
        APP_STATE.userProfile = {
            gender,
            age,
            weight: weightKg,
            height: heightCm,
            activityMultiplier: activity,
            goal,
            dietPreference: APP_STATE.userProfile.dietPreference // preserve diet choice
        };

        // Trigger metabolic calculators
        calculateHealthMetrics();
    });
}

function calculateHealthMetrics() {
    const profile = APP_STATE.userProfile;
    
    // 1. Calculate BMI
    const heightMeters = profile.height / 100;
    const bmi = profile.weight / (heightMeters * heightMeters);
    APP_STATE.analytics.bmi = Math.round(bmi * 10) / 10;

    // 2. BMI Interpretation
    let bmiStatus = '';
    let bmiText = '';
    
    if (bmi < 18.5) {
        bmiStatus = 'Underweight';
        bmiText = 'You reside in the underweight scale. We suggest focusing on a supportive caloric surplus of clean complex carbs and healthy fats to establish physical strength.';
    } else if (bmi >= 18.5 && bmi < 25) {
        bmiStatus = 'Normal Weight';
        bmiText = 'You fall within a healthy weight spectrum. Maintain dynamic cardiovascular activity, structural muscle toning, and balanced dietary protocols to lock in this status.';
    } else if (bmi >= 25 && bmi < 30) {
        bmiStatus = 'Overweight';
        bmiText = 'You lie on the overweight scale. Gradual adjustments to daily energy balances—by introducing light daily cardio and steady strength work—will yield excellent results.';
    } else {
        bmiStatus = 'Obese';
        bmiText = 'Your baseline indices suggest a clinical status of obesity. We advocate utilizing a moderate caloric deficit, portion optimization, and routine medical checkups to safely guide recovery.';
    }
    APP_STATE.analytics.bmiStatus = bmiStatus;

    // 3. Basal Metabolic Rate (BMR) - Mifflin-St Jeor Equation
    let bmr = 0;
    if (profile.gender === 'male') {
        bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
    } else {
        bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
    }
    APP_STATE.analytics.bmr = Math.round(bmr);

    // 4. Total Daily Energy Expenditure (TDEE)
    const tdee = bmr * profile.activityMultiplier;
    APP_STATE.analytics.tdee = Math.round(tdee);

    // 5. Target Daily Calories (Goal Adjustments)
    let targetCal = tdee;
    let goalDescription = '';
    
    if (profile.goal === 'lose') {
        targetCal = tdee - 500;
        // Safety bound: don't suggest dropping below 1200 kcal
        if (targetCal < 1200) targetCal = 1200;
        goalDescription = 'Caloric deficit tailored for healthy weight reduction.';
    } else if (profile.goal === 'gain') {
        targetCal = tdee + 400;
        goalDescription = 'Caloric surplus curated for lean skeletal muscle building.';
    } else {
        goalDescription = 'Caloric maintenance plan designed to secure weight stability.';
    }
    APP_STATE.analytics.targetCalories = Math.round(targetCal);

    // 6. Generate Meal Plan and Macro targets
    generateDynamicMealPlan(APP_STATE.userProfile.dietPreference);

    // 7. Update UI Displays
    updateAnalyticsUI(goalDescription);
}

// --- Update UI with Calculated Analytics ---
function updateAnalyticsUI(goalDescription) {
    const resultsSec = document.getElementById("results-section");
    const dietSec = document.getElementById("diet-section");
    
    // Unhide panels with smooth scroll anchor
    resultsSec.classList.remove("hidden");
    dietSec.classList.remove("hidden");

    // Scroll to results seamlessly
    resultsSec.scrollIntoView({ behavior: 'smooth' });

    // Update Nav links
    document.getElementById("nav-results-link").classList.add("active");
    document.getElementById("nav-diet-link").classList.remove("active");

    // Set numbers
    document.getElementById("result-bmi-number").textContent = APP_STATE.analytics.bmi;
    document.getElementById("result-bmr-value").textContent = `${APP_STATE.analytics.bmr.toLocaleString()} kcal`;
    document.getElementById("result-tdee-value").textContent = `${APP_STATE.analytics.tdee.toLocaleString()} kcal`;
    document.getElementById("result-target-value").textContent = `${APP_STATE.analytics.targetCalories.toLocaleString()} kcal`;
    document.getElementById("result-goal-desc").textContent = goalDescription;
    document.getElementById("bmi-interpretation-text").textContent = '';
    
    // Type out the text for dynamic feeling
    typeWriter(document.getElementById("bmi-interpretation-text"), APP_STATE.analytics.bmiStatus + ": " + bmiTextMap(), 0);

    // Speedometer SVG adjustments
    updateBmiSpeedometer(APP_STATE.analytics.bmi, APP_STATE.analytics.bmiStatus);

    // Macronutrient rings and text adjustments
    updateMacronutrientsUI();
}

function bmiTextMap() {
    const bmi = APP_STATE.analytics.bmi;
    if (bmi < 18.5) return 'You reside in the underweight scale. We suggest focusing on a supportive caloric surplus of clean complex carbs and healthy fats to establish physical strength.';
    if (bmi >= 18.5 && bmi < 25) return 'You fall within a healthy weight spectrum. Maintain dynamic cardiovascular activity, structural muscle toning, and balanced dietary protocols to lock in this status.';
    if (bmi >= 25 && bmi < 30) return 'You lie on the overweight scale. Gradual adjustments to daily energy balances—by introducing light daily cardio and steady strength work—will yield excellent results.';
    return 'Your baseline indices suggest a clinical status of obesity. We advocate utilizing a moderate caloric deficit, portion optimization, and routine medical checkups to safely guide recovery.';
}

let typewriterTimeoutId = null;

function typeWriter(element, text, i) {
    if (i === 0) {
        element.innerHTML = '';
        if (typewriterTimeoutId) {
            clearTimeout(typewriterTimeoutId);
        }
    }
    if (i < text.length) {
        element.innerHTML += text.charAt(i);
        typewriterTimeoutId = setTimeout(() => typeWriter(element, text, i + 1), 15);
    }
}

// Speedometer Gauge Angle and Colors
function updateBmiSpeedometer(bmi, status) {
    const badge = document.getElementById("result-bmi-badge");
    const needle = document.getElementById("gauge-needle-group");
    const fillArc = document.getElementById("gauge-indicator-arc");

    // Clean badge styles
    badge.className = "gauge-badge";
    let statusClass = "status-normal";
    let arcColor = "var(--color-normal)";

    if (status === "Underweight") {
        statusClass = "status-under";
        arcColor = "var(--color-underweight)";
    } else if (status === "Normal Weight") {
        statusClass = "status-normal";
        arcColor = "var(--color-normal)";
    } else if (status === "Overweight") {
        statusClass = "status-over";
        arcColor = "var(--color-overweight)";
    } else {
        statusClass = "status-obese";
        arcColor = "var(--color-obese)";
    }
    badge.classList.add(statusClass);
    badge.textContent = status;

    // Calculate rotation degree
    // Scale BMI 15 to 35 on a 0 to 180 degree spectrum
    let deg = 0;
    if (bmi <= 15) {
        deg = 0;
    } else if (bmi >= 35) {
        deg = 180;
    } else {
        deg = ((bmi - 15) / (35 - 15)) * 180;
    }

    // Set styling values
    needle.style.transform = `rotate(${deg}deg)`;
    fillArc.style.stroke = arcColor;

    // Circle dash calculation (Pi * r = 251.2 circumference)
    const arcPercent = deg / 180;
    const offset = 251.2 - (arcPercent * 251.2);
    fillArc.style.strokeDashoffset = offset;
}

// --- Dynamic Diet Generator & Active Meal Setup ---
function generateDynamicMealPlan(dietPref) {
    APP_STATE.userProfile.dietPreference = dietPref;
    const calories = APP_STATE.analytics.targetCalories;
    const splits = MACRO_SPLITS[dietPref];

    // Compute Macro Gram targets
    // Carb: 4 kcal/g, Protein: 4 kcal/g, Fats: 9 kcal/g
    const carbGrams = Math.round((calories * splits.carbs) / 4);
    const proteinGrams = Math.round((calories * splits.protein) / 4);
    const fatGrams = Math.round((calories * splits.fats) / 9);

    APP_STATE.analytics.macros = {
        carbs: carbGrams,
        protein: proteinGrams,
        fats: fatGrams
    };

    // Construct a comprehensive 7-day meal plan array
    APP_STATE.activeMealPlan = [];
    const pool = MEAL_DATABASE[dietPref];

    for (let day = 0; day < 7; day++) {
        // Retrieve random indexes from pools for each meal type to create variation
        const bIdx = (day) % pool.breakfast.length;
        const lIdx = (day + 1) % pool.lunch.length;
        const dIdx = (day + 2) % pool.dinner.length;
        const sIdx = (day + 3) % pool.snack.length;

        // Clone meals and allocate scaled nutritional quantities based on calorie goal
        APP_STATE.activeMealPlan.push({
            breakfast: scaleMeal(pool.breakfast[bIdx], calories, 'breakfast'),
            lunch: scaleMeal(pool.lunch[lIdx], calories, 'lunch'),
            dinner: scaleMeal(pool.dinner[dIdx], calories, 'dinner'),
            snack: scaleMeal(pool.snack[sIdx], calories, 'snack')
        });
    }

    // Render active day meals
    renderMealsForActiveDay();
    // Re-aggregate weekly groceries list
    compileGroceriesList();
}

// Scales nutritional content of meals from databases to hit targeted calorie percentages perfectly
function scaleMeal(baseMeal, totalCals, type) {
    // Standard distribution target per meal type:
    // Breakfast: 25%, Lunch: 35%, Dinner: 30%, Snack: 10%
    let distribution = 0.25;
    if (type === 'lunch') distribution = 0.35;
    if (type === 'dinner') distribution = 0.30;
    if (type === 'snack') distribution = 0.10;

    const mealTargetCal = totalCals * distribution;
    
    // Scale macros accordingly
    const carbsGrams = Math.round((mealTargetCal * baseMeal.c) * 10) / 10;
    const proteinGrams = Math.round((mealTargetCal * baseMeal.p) * 10) / 10;
    const fatGrams = Math.round((mealTargetCal * baseMeal.f) * 10) / 10;
    const calValue = Math.round(mealTargetCal);

    return {
        name: baseMeal.name,
        ingredients: [...baseMeal.ingredients], // shallow copy
        calories: calValue,
        carbs: carbsGrams,
        protein: proteinGrams,
        fats: fatGrams,
        type: type // store meal category
    };
}

// --- Macronutrient Chart Render (SVG Rings) ---
function updateMacronutrientsUI() {
    const calLabel = document.getElementById("planner-calories-num");
    const carbsText = document.getElementById("macro-carb-val");
    const proteinText = document.getElementById("macro-protein-val");
    const fatText = document.getElementById("macro-fat-val");

    const carbsRing = document.getElementById("macro-carb-ring");
    const proteinRing = document.getElementById("macro-protein-ring");
    const fatRing = document.getElementById("macro-fat-ring");

    const dietPref = APP_STATE.userProfile.dietPreference;
    const splits = MACRO_SPLITS[dietPref];
    const macros = APP_STATE.analytics.macros;

    // Set values
    calLabel.textContent = APP_STATE.analytics.targetCalories.toLocaleString();
    carbsText.textContent = `${macros.carbs}g (${Math.round(splits.carbs * 100)}%)`;
    proteinText.textContent = `${macros.protein}g (${Math.round(splits.protein * 100)}%)`;
    fatText.textContent = `${macros.fats}g (${Math.round(splits.fats * 100)}%)`;

    // Outer Carb ring: circumference 377
    carbsRing.style.strokeDashoffset = 377 - (splits.carbs * 377);

    // Middle Protein ring: circumference 283
    proteinRing.style.strokeDashoffset = 283 - (splits.protein * 283);

    // Inner Fat ring: circumference 188
    fatRing.style.strokeDashoffset = 188 - (splits.fats * 188);
}

// --- Dynamic Meal Cards Rendering ---
function renderMealsForActiveDay() {
    const container = document.getElementById("meals-list-container");
    container.innerHTML = '';

    const dayPlan = APP_STATE.activeMealPlan[APP_STATE.currentDay];
    if (!dayPlan) return;

    const types = ['breakfast', 'lunch', 'dinner', 'snack'];
    const icons = {
        breakfast: 'fa-coffee',
        lunch: 'fa-utensils',
        dinner: 'fa-bowl-food',
        snack: 'fa-apple-whole'
    };

    types.forEach(type => {
        const meal = dayPlan[type];
        
        const card = document.createElement("div");
        card.className = "meal-card animate-fade-in";
        card.innerHTML = `
            <div class="meal-type-tag">
                <i class="fa-solid ${icons[type]}"></i>
                <span>${type}</span>
            </div>
            <div class="meal-info">
                <h4>${meal.name}</h4>
                <div class="meal-ingredients">
                    <strong>Ingredients:</strong> ${meal.ingredients.join(', ')}
                </div>
            </div>
            <div class="meal-macros">
                <span class="meal-calories-badge">${meal.calories} kcal</span>
                <span class="meal-macros-details">C: ${meal.carbs}g | P: ${meal.protein}g | F: ${meal.fats}g</span>
                <button class="btn-swap-meal" data-type="${type}">
                    <i class="fa-solid fa-arrows-rotate"></i> Swap Meal
                </button>
            </div>
        `;

        // Wire Up Swap Event Listener directly on the swap button
        card.querySelector(".btn-swap-meal").addEventListener("click", (e) => {
            const mealType = e.currentTarget.getAttribute("data-type");
            swapMealAction(mealType);
        });

        container.appendChild(card);
    });
}

// --- Dynamic Meal Swapper Action ---
function swapMealAction(mealType) {
    const dietPref = APP_STATE.userProfile.dietPreference;
    const pool = MEAL_DATABASE[dietPref][mealType];
    const currentMeal = APP_STATE.activeMealPlan[APP_STATE.currentDay][mealType];

    // Filter out the active meal name to avoid swapping to the same dish
    const availablePool = pool.filter(m => m.name !== currentMeal.name);
    if (availablePool.length === 0) return;

    // Pick a random alternative meal
    const randIndex = Math.floor(Math.random() * availablePool.length);
    const chosenAlternative = availablePool[randIndex];

    // Scale alternative to match caloric goal profile
    const scaledAlternative = scaleMeal(chosenAlternative, APP_STATE.analytics.targetCalories, mealType);

    // Apply spin rotation animation to icon
    const cardEl = document.querySelector(`.btn-swap-meal[data-type="${mealType}"]`);
    const spinIcon = cardEl.querySelector("i");
    spinIcon.style.transition = 'transform 0.6s ease';
    spinIcon.style.transform = 'rotate(360deg)';

    // Update State
    APP_STATE.activeMealPlan[APP_STATE.currentDay][mealType] = scaledAlternative;

    // Re-render and update aggregations
    setTimeout(() => {
        renderMealsForActiveDay();
        compileGroceriesList();
    }, 200);
}

// --- Diet Filters & Day Selectors ---
function initDietPlanModifiers() {
    // Diet Filter Toggles
    const filterBtns = document.querySelectorAll(".diet-filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const selectedDiet = btn.getAttribute("data-diet");
            
            // Highlight active button
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Recompute plan
            APP_STATE.userProfile.dietPreference = selectedDiet;
            generateDynamicMealPlan(selectedDiet);
            updateMacronutrientsUI();
        });
    });

    // Day Selector Toggles
    const dayBtns = document.querySelectorAll(".day-btn");
    dayBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const selectedDay = parseInt(btn.getAttribute("data-day"));
            
            // Highlight active button
            dayBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Update state
            APP_STATE.currentDay = selectedDay;
            renderMealsForActiveDay();
        });
    });
}

// --- Grocery Checklist Aggregator & Clipboard Copy ---
function initGroceryAggregator() {
    const btnCopy = document.getElementById("btn-copy-groceries");
    btnCopy.addEventListener("click", copyGroceriesToClipboard);
}

function compileGroceriesList() {
    const listContainer = document.getElementById("groceries-list-container");
    listContainer.innerHTML = '';

    // Walk through all 7 days of active meal plan and aggregate ingredients
    const weeklyIngredients = new Set();
    
    APP_STATE.activeMealPlan.forEach(dayPlan => {
        const types = ['breakfast', 'lunch', 'dinner', 'snack'];
        types.forEach(type => {
            const meal = dayPlan[type];
            if (meal && meal.ingredients) {
                meal.ingredients.forEach(ingredient => {
                    // Normalize standard string formats (e.g. "Rolled Oats (60g)" -> remove quantities/parenthesis for shopping checklist cleanliness)
                    const cleaned = ingredient.replace(/\s*\([^)]*\)*/g, "").trim();
                    if (cleaned) {
                        weeklyIngredients.add(cleaned);
                    }
                });
            }
        });
    });

    // Render aggregated checkboxes
    const sortedList = Array.from(weeklyIngredients).sort();
    
    sortedList.forEach((item, index) => {
        const checkboxId = `grocery-item-${index}`;
        const label = document.createElement("label");
        label.className = "grocery-checkbox-label animate-fade-in";
        label.setAttribute("for", checkboxId);
        
        label.innerHTML = `
            <input type="checkbox" id="${checkboxId}">
            <div class="grocery-custom-check">
                <i class="fa-solid fa-check"></i>
            </div>
            <span class="grocery-name">${item}</span>
        `;

        listContainer.appendChild(label);
    });
}

function copyGroceriesToClipboard() {
    const checkboxes = document.querySelectorAll("#groceries-list-container input[type='checkbox']");
    const itemsList = [];

    checkboxes.forEach(chk => {
        const label = chk.closest(".grocery-checkbox-label");
        const name = label.querySelector(".grocery-name").textContent;
        // Prefix with [ ] or [x] based on state
        const status = chk.checked ? "[x]" : "[ ]";
        itemsList.push(`${status} ${name}`);
    });

    if (itemsList.length === 0) {
        alert("Your shopping list is empty. Run calculations to generate diet plans!");
        return;
    }

    const textToCopy = `Priti's Fitness — Your Personalized Weekly Grocery List\n==================================================\n\n` + itemsList.join('\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
        const copyBtn = document.getElementById("btn-copy-groceries");
        const originalContent = copyBtn.innerHTML;
        
        copyBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Copied Successfully!`;
        copyBtn.style.backgroundColor = "var(--color-accent)";
        copyBtn.style.color = "#fff";

        setTimeout(() => {
            copyBtn.innerHTML = originalContent;
            copyBtn.style.backgroundColor = '';
            copyBtn.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error("Failed to copy groceries list: ", err);
        alert("Failed to write to clipboard automatically. Please copy the values manually!");
    });
}
