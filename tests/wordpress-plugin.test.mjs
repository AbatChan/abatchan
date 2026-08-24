import { readFileSync } from 'node:fs';

const php=readFileSync(new URL('../wordpress/nika-site-guide/nika-site-guide.php',import.meta.url),'utf8');
const readme=readFileSync(new URL('../wordpress/nika-site-guide/readme.txt',import.meta.url),'utf8');

let failed=false;
const check=(label,value)=>{
  const pass=Boolean(value);
  console.log(`${pass?'PASS':'FAIL'}  ${label}`);
  if(!pass)failed=true;
};

console.log('=== WordPress connector ===');
check('plugin is GPL licensed',php.includes('License:           GPL-2.0-or-later'));
check('site key is strictly sanitized',php.includes("preg_match( '/^[A-Za-z0-9_-]+$/"));
check('widget only loads when enabled and configured',php.includes("! $settings['enabled'] || ! $settings['site_key']"));
check('embed receives the tenant key',php.includes("'<script data-site=\"'"));
check('connection test sends the WordPress origin',php.includes("'Origin' => untrailingslashit( home_url() )"));
check('connection test is capability and nonce protected',php.includes("current_user_can( 'manage_options' )")&&php.includes("check_admin_referer( 'nika_site_guide_test' )"));
check('external service is disclosed',readme.includes('= External service =')&&readme.includes('https://abatchan.com/privacy'));
check('site key is described as public',readme.includes('site key appears in the public page source'));

if(failed)process.exit(1);
console.log('\nall passed');
