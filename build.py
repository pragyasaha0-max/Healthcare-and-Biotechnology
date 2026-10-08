import re,base64
b=lambda n:'data:image/jpeg;base64,'+base64.b64encode(open(f'img/{n}.jpg','rb').read()).decode()
p=open('page.html').read()
p=p.replace('{{THEME_CSS}}',open('clinical-light.css').read()).replace('{{THEME_JS}}',open('clinical-light.js').read()).replace('{{HELPERS}}',open('helpers.js').read())
for k,n in [('HERO','hero'),('LAB','lab'),('MAP','map')]+[('A%d'%i,'a%d'%i) for i in range(1,7)]: p=p.replace('{{%s}}'%k,b(n))
assert '{{' not in p
open('index.html','w').write(p)
css=''.join(re.findall(r'<style>(.*?)</style>',p,re.S));print(len(p)//1024,'KB css braces',css.count('{'),css.count('}'),'script tags',len(re.findall(r'<script[ >]',p)),p.count('</script>'))
ids=set(re.findall(r'id="([\w-]+)"',p));ref=set(re.findall(r"\$\('([\w-]+)'\)",p));print('missing ids',ref-ids)
sc=re.findall(r'<script>\n(.*?)</script>',p,re.S)
for i,s in enumerate(sc): open(f's{i}.js','w').write(s)
