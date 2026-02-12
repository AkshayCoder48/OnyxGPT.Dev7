import os

with open('src/pages/ProjectLandingPage.jsx', 'r') as f:
    content = f.read()

old_code = """    if (!user) {
      await signIn();
      return;
    }"""

new_code = """    if (!user) {
      const result = await signIn();
      if (!result) return;
    }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/pages/ProjectLandingPage.jsx', 'w') as f:
        f.write(content)
    print("Successfully patched handleCreateProject")
else:
    print("Could not find code to patch")
