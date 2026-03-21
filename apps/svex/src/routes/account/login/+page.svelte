<script lang="ts">
	let { form } = $props();
</script>

<h1>Login</h1>
<p class="block-desc">Sign in with your account (username + password).</p>

<article class="block">
	<form method="POST" action="?/login">
		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}
		<div class="form-group">
			<label for="username">Username</label>
			<input id="username" name="username" type="text" autocomplete="username" required />
		</div>
		<div class="form-group">
			<label for="password">Password</label>
			<input id="password" name="password" type="password" autocomplete="current-password" required />
		</div>
		<button type="submit" class="btn btn-primary">Login</button>
	</form>
</article>
