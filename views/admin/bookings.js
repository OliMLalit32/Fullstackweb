<% layout("/layouts/boilerplate") %>

<div class="dashboard-page">
  <div class="container-fluid py-4 px-4">
    <div class="dashboard-header mb-4">
      <div>
        <h3><i class="fa-solid fa-calendar-check me-2 text-purple"></i>All Bookings</h3>
        <p class="text-muted mb-0">View all booking activity across the platform</p>
      </div>
      <a href="/admin/dashboard" class="btn-cancel">← Dashboard</a>
    </div>

    <div class="dashboard-section">
      <% if (bookings.length === 0) { %>
        <div class="empty-state text-center py-5">
          <i class="fa-solid fa-calendar-xmark empty-icon mb-3"></i>
          <h5>No bookings yet</h5>
        </div>
      <% } else { %>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Client</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <% for (let b of bookings) { %>
                <tr>
                  <td class="fw-600"><%= b.listing ? b.listing.title : '—' %></td>
                  <td><%= b.client ? (b.client.fullName || b.client.username) : '—' %></td>
                  <td><%= new Date(b.checkIn).toDateString() %></td>
                  <td><%= new Date(b.checkOut).toDateString() %></td>
                  <td class="text-purple fw-600">₹<%= b.totalAmount.toLocaleString("en-IN") %></td>
                  <td>
                    <% if (b.paymentConfirmed) { %>
                      <span class="text-success small fw-600"><i class="fa-solid fa-check me-1"></i>Confirmed</span>
                    <% } else { %>
                      <span class="text-warning small fw-600"><i class="fa-solid fa-clock me-1"></i>Pending</span>
                    <% } %>
                  </td>
                  <td><span class="status-badge status-<%= b.status %>"><%= b.status %></span></td>
                </tr>
              <% } %>
            </tbody>
          </table>
        </div>
      <% } %>
    </div>
  </div>
</div>
