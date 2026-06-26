import sys
import pexpect

def run_ssh_commands():
    ip = "172.190.109.60"
    user = "webdev"
    password = "Unzip-Brutishly-Pendant-Idiom3-Unadorned-Annually"
    
    ssh_cmd = f"ssh -o StrictHostKeyChecking=no {user}@{ip}"
    child = pexpect.spawn(ssh_cmd, timeout=60, encoding='utf-8')
    
    index = child.expect([r"[Pp]assword:", pexpect.EOF, pexpect.TIMEOUT])
    if index != 0:
        print("Error connecting or no password prompt")
        print(child.before)
        return
        
    child.sendline(password)
    
    # Wait for bash prompt
    index = child.expect([r"\$", r"#", pexpect.EOF, pexpect.TIMEOUT])
    if index >= 2:
        print("Failed to log in (incorrect password or timeout)")
        print(child.before)
        return
        
    print("Logged in successfully. Setting up Nginx config...")
    
    # Write Nginx configuration to /tmp/default
    child.sendline("cat << 'NGINX_CONF' > /tmp/default")
    child.expect(r">")
    child.sendline("server {")
    child.expect(r">")
    child.sendline("    listen 80;")
    child.expect(r">")
    child.sendline("    server_name dmw-projects-rfq.dmwcc.com;")
    child.expect(r">")
    child.sendline("    location / {")
    child.expect(r">")
    child.sendline("        proxy_pass http://127.0.0.1:8080;")
    child.expect(r">")
    child.sendline("        proxy_http_version 1.1;")
    child.expect(r">")
    child.sendline("        proxy_set_header Upgrade $http_upgrade;")
    child.expect(r">")
    child.sendline("        proxy_set_header Connection 'upgrade';")
    child.expect(r">")
    child.sendline("        proxy_set_header Host $host;")
    child.expect(r">")
    child.sendline("        proxy_cache_bypass $http_upgrade;")
    child.expect(r">")
    child.sendline("        proxy_set_header X-Real-IP $remote_addr;")
    child.expect(r">")
    child.sendline("        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;")
    child.expect(r">")
    child.sendline("    }")
    child.expect(r">")
    child.sendline("}")
    child.expect(r">")
    child.sendline("NGINX_CONF")
    child.expect([r"\$", r"#"])
    
    print("Nginx config written to /tmp/default. Moving to /etc/nginx/sites-available/default...")
    
    # Move to /etc/nginx/sites-available/default using sudo
    child.sendline("sudo mv /tmp/default /etc/nginx/sites-available/default")
    index = child.expect([r"\[sudo\] password for", r"\$", r"#"])
    if index == 0:
        child.sendline(password)
        child.expect([r"\$", r"#"])
        
    print("Config moved. Enabling site and reloading Nginx...")
    child.sendline("sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default")
    child.expect([r"\$", r"#"])
    
    child.sendline("sudo systemctl restart nginx")
    child.expect([r"\$", r"#"])
    
    print("Installing Certbot Certificate...")
    child.sendline("sudo certbot install --cert-name dmw-projects-rfq.dmwcc.com --nginx")
    # Certbot takes a while, set high timeout
    index = child.expect([r"\$", r"#", pexpect.TIMEOUT], timeout=120)
    if index == 2:
        print("Certbot timed out.")
        print(child.before)
    else:
        print("Certbot finished!")
        print(child.before)
        
    child.sendline("exit")
    child.expect(pexpect.EOF)

if __name__ == "__main__":
    run_ssh_commands()
