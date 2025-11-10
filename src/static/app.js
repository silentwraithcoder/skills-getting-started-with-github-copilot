document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // helper to avoid injecting raw HTML from API
  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // force fresh response to avoid stale cached GETs
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select but keep the default placeholder option if present
      const defaultOption = activitySelect.querySelector('option[value=""]');
      activitySelect.innerHTML = "";
      if (defaultOption) activitySelect.appendChild(defaultOption);

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - (details.participants?.length || 0);

        // Build participants section
        let participantsHTML = "";
        if (details.participants && details.participants.length > 0) {
          participantsHTML = `
            <div class="participants">
              <strong>Participants (${details.participants.length}):</strong>
              <ul data-activity="${escapeHtml(name)}">
                ${details.participants.map(p => `<li class="participant-item"><span class="participant-email">${escapeHtml(p)}</span><button class="remove-btn" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Unregister ${escapeHtml(p)}">✖</button></li>`).join("")}
              </ul>
            </div>
          `;
        } else {
          participantsHTML = `
            <div class="participants">
              <strong>Participants:</strong>
              <span class="no-participants">No one yet</span>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach click handlers for remove buttons inside this activity card
        activityCard.querySelectorAll(".remove-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const activity = btn.dataset.activity;
            const email = btn.dataset.email;

            try {
              const resp = await fetch(
                `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
                {
                  method: "DELETE",
                }
              );

              const resJson = await resp.json();

              if (resp.ok) {
                messageDiv.textContent = resJson.message;
                messageDiv.className = "message success";
                // Refresh the list to reflect the removal
                await fetchActivities();
              } else {
                messageDiv.textContent = resJson.detail || "Failed to unregister";
                messageDiv.className = "message error";
              }

              messageDiv.classList.remove("hidden");
              setTimeout(() => {
                messageDiv.classList.add("hidden");
              }, 5000);
            } catch (err) {
              messageDiv.textContent = "Error unregistering participant.";
              messageDiv.className = "message error";
              messageDiv.classList.remove("hidden");
              console.error("Error unregistering participant:", err);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);

      // Refresh activities to reflect new participant (await to ensure UI updates)
      await fetchActivities();
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
