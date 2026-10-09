
const loadButton = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const status = document.getElementById("status");
const usersList = document.getElementById("users-list");

// Store the users returned by the API.
let users = [];
let usersLoaded = false;

// Fetch users from the API.
async function loadUsers() {
    loadButton.disabled = true;
    loadButton.textContent = "Loading...";
    status.textContent = "Loading users...";
    usersList.replaceChildren();

    try {
        const response = await fetch(
            "https://jsonplaceholder.typicode.com/users"
        );

        // Check whether the request was successful.
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();

        // Save the users so filtering does not make another request.
        users = data;
        usersLoaded = true;

        renderUsers(users);

        if (users.length > 0) {
            status.textContent = `Successfully loaded ${users.length} users.`;
        } else {
            status.textContent = "No users available.";
        }
    } catch (error) {
        users = [];
        usersLoaded = false;
        usersList.replaceChildren();

        status.textContent =
            "Error loading users. Please check your connection and try again.";

        console.error("Error loading users:", error);
    } finally {
        loadButton.disabled = false;
        loadButton.textContent = "Load Users";
    }
}

// Display any array of users.
function renderUsers(list) {
    usersList.replaceChildren();

    if (list.length === 0) {
        if (usersLoaded && filterInput.value.trim() !== "") {
            status.textContent = "No users match your filter.";
        }
        return;
    }

    list.forEach((user) => {
        const listItem = document.createElement("li");

        const name = document.createElement("h2");
        name.textContent = user.name;

        const email = document.createElement("p");
        email.textContent = `Email: ${user.email}`;

        const city = document.createElement("p");
        city.textContent = `City: ${user.address.city}`;

        const company = document.createElement("p");
        company.textContent = `Company: ${user.company.name}`;

        listItem.append(name, email, city, company);
        usersList.appendChild(listItem);
    });

    status.textContent = `Showing ${list.length} user(s).`;
}

// Load users when the button is clicked.
loadButton.addEventListener("click", loadUsers);

// Filter the stored users as the user types.
filterInput.addEventListener("input", () => {
    const searchText = filterInput.value.trim().toLowerCase();

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchText)
    );

    if (usersLoaded) {
        renderUsers(filteredUsers);
    }
});