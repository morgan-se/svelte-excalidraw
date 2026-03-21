<script lang="ts">
	let { form } = $props();
</script>

<h1>Create account</h1>
<p class="block-desc">Register as a trusted user (stable username, optional password for cross-device login).</p>

<article class="block">
	<form method="POST" action="?/create">
		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}
		<div class="form-group">
			<label for="username">Username</label>
			<input id="username" name="username" type="text" autocomplete="username" required minlength="2" maxlength="64" />
		</div>
		<div class="form-group">
			<label for="password">Password</label>
			<input id="password" name="password" type="password" autocomplete="new-password" required minlength="8" />
		</div>
		<button type="submit" class="btn btn-primary">Create account</button>
	</form>
</article>
