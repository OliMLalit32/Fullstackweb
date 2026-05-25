<% layout("/layouts/boilerplate") %>

<div class="dashboard-page">
  <div class="container-fluid py-4 px-4">
    <div class="dashboard-header mb-4">
      <div>
        <h3><i class="fa-solid fa-users me-2 text-purple"></i>All Users</h3>
        <p class="text-muted mb-0">Manage user accounts and roles</p>
      </div>
      <a href="/admin/dashboard" class="btn-cancel">← Dashboard</a>
    </div>

    <div class="dashboard-section">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            <% for (let u of users) { %>
              <tr>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <div class="user-avatar-sm"><%= (u.fullName || u.username).charAt(0).toUpperCase() %></div>
                    <%= u.fullName || '—' %>
                  </div>
                </td>
                <td>@<%= u.username %></td>
                <td><%= u.email %></td>
                <td><span class="role-badge-sm role-<%= u.role %>"><%= u.role %></span></td>
                <td class="text-muted small"><%= new Date(u.createdAt).toDateString() %></td>
                <td>
                  <form method="POST" action="/admin/users/<%= u._id %>/role" class="d-flex gap-2 align-items-center">
                    <select name="role" class="form-select form-select-sm" style="width:auto;">
                      <option value="client" <%= u.role === 'client' ? 'selected' : '' %>>Client</option>
                      <option value="owner" <%= u.role === 'owner' ? 'selected' : '' %>>Owner</option>
                      <option value="admin" <%= u.role === 'admin' ? 'selected' : '' %>>Admin</option>
                    </select>
                    <button type="submit" class="btn-confirm-sm">Update</button>
                  </form>
                </td>
              </tr>
            <% } %>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
