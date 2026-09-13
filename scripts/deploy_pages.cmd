@echo off
REM Build rồi đẩy thư mục dist lên nhánh gh-pages (GitHub Pages: https://kentjuno.github.io/quan-bun/)
cd /d %~dp0..
call npx vite build || exit /b 1
cd dist
type nul > .nojekyll
git init -q
git checkout -q -B gh-pages
git add -A
git -c user.name="quan-bun deploy" -c user.email="deploy@quan-bun.local" commit -q -m "deploy %date% %time%"
git push -f https://github.com/kentjuno/quan-bun.git gh-pages
cd ..
rmdir /s /q dist\.git
echo DEPLOYED
