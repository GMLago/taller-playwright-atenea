import { test, expect, request } from '@playwright/test';
import { RegisterPage } from '../pages/registerPage';
import TestData from '../data/testData.json';

let registerPage: RegisterPage;
 
test.beforeEach (async ({ page }) => {
  registerPage = new RegisterPage(page);
  await registerPage.visitarPaginaRegistro();
});

test('TC-1 verificacion elementos visuales en la pagina de resgitro', async ({ page }) => {
  await expect(registerPage.firstNameInput).toBeVisible();
  await expect(registerPage.lastNameInput).toBeVisible();
  await expect(registerPage.emailInput).toBeVisible();
  await expect(registerPage.passwordInput).toBeVisible();
  await expect(registerPage.registerButton).toBeVisible();
});

test('TC-2 verificar Boton de registro esta inhabilitado por dedecto', async ({ page }) => {
  await expect(registerPage.registerButton).toBeDisabled();
});

test('TC-3 verificar que el boton de geristro se habilita al completar los campos', async ({ page }) => {
  await registerPage.completarFormularioRegistro(TestData.usuarioValido);
  await expect(registerPage.registerButton).toBeEnabled();
});

test('TC-4 Verificar redireccionamiento a página de inicio de sesión al hacer clic en el botón de registro', async ({ page }) => {
  await registerPage.loginButton.click();
  await expect(page).toHaveURL('http://localhost:3000/login');
});

test('TC-5 Verificar Registro exitoso con datos válidos', async ({ page }) => {
  const email = (TestData.usuarioValido.email.split( '@' )[0] +  Date.now().toString() + '@' + TestData.usuarioValido.email.split( '@' )[1]);
  TestData.usuarioValido.email = email; 
  await registerPage.completarYHacerClickBotonRegistro(TestData.usuarioValido);

  await expect(page.getByText('Registro exitoso')).toBeVisible();
});

test('TC-6 Verificar que un usuario no pueda registrarse con un correo electrónico ya existente', async ({ page }) => {
  const email = (TestData.usuarioValido.email.split('@')[0] +  Date.now().toString() + '@' + TestData.usuarioValido.email.split('@')[1]);
  TestData.usuarioValido.email = email; 
  await registerPage.completarYHacerClickBotonRegistro(TestData.usuarioValido);
  await expect(page.getByText('Registro exitoso')).toBeVisible();
  await registerPage.visitarPaginaRegistro(); 
  await registerPage.completarYHacerClickBotonRegistro(TestData.usuarioValido);
  await expect(page.getByText('Email already in use')).toBeVisible();
  await expect(page.getByText('Registro exitoso')).not.toBeVisible();

}); 


test('TC-8 Verificar Registro exitoso con datos válidos verificando respuesta de la API', async ({ page }) => {
  const email = (TestData.usuarioValido.email.split( '@' )[0] +  Date.now().toString() + '@' + TestData.usuarioValido.email.split( '@' )[1]);
  TestData.usuarioValido.email = email; 
  await registerPage.completarFormularioRegistro(TestData.usuarioValido);

// Verificar que la API de tipo POST responda con un status code 201
const responsePromise = page.waitForResponse('http://localhost:6007/api/auth/signup');
  await registerPage.hacerClickBotonRegistro();
  const response = await responsePromise;
  const responseBody = await response.json();

  expect(response.status()).toBe(201);
  expect(responseBody).toHaveProperty('token');
  expect((typeof responseBody.token)).toBe('string');
  expect(responseBody).toHaveProperty('user');
  expect(responseBody.user).toEqual(expect.objectContaining({
    id: expect.any(String),
    firstName: TestData.usuarioValido.nombre,
    lastName: TestData.usuarioValido.apellido,
    email: TestData.usuarioValido.email,
  })
  );
  await expect(page.getByText('Registro exitoso')).toBeVisible();
});


test('TC-9 Generar signup desde la API', async ({ page, request }) => {
  const email = (TestData.usuarioValido.email.split('@')[0]) + Date.now().toString() + '@' + TestData.usuarioValido.email.split('@')[1];
  const response = await request.post('http://localhost:6007/api/auth/signup', {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    data: {
      firstName: TestData.usuarioValido.nombre,
      lastName: TestData.usuarioValido.apellido,
      email: email,
      password: TestData.usuarioValido.contraseña,
    }
  });
  const responseBody = await response.json();
  expect(response.status()).toBe(201);
  expect(responseBody).toHaveProperty('token');
  expect(typeof responseBody.token).toBe('string');
  expect(responseBody).toHaveProperty('user');
  expect(responseBody.user).toEqual(expect.objectContaining({
    id: expect.any(String),
    firstName: TestData.usuarioValido.nombre,
    lastName: TestData.usuarioValido.apellido,
    email: email,
  }));
});

test('TC-10 Verificar comportamiento del front ante un error 500 en el registro', async ({ page }) => {
  const email = (TestData.usuarioValido.email.split('@')[0]) + Date.now().toString() + '@' + TestData.usuarioValido.email.split('@')[1];

  // Interceptar la solicitud de registro y devolver un error 500
  await page.route('**/api/auth/signup', route => {
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email already in use' }),
    });
  });

  // Llenar el formulario
  await registerPage.firstNameInput.fill(TestData.usuarioValido.nombre);
  await registerPage.lastNameInput.fill(TestData.usuarioValido.apellido);
  await registerPage.emailInput.fill(email);
  await registerPage.passwordInput.fill(TestData.usuarioValido.contraseña);
  await registerPage.registerButton.click();

  // Verificar que se muestra un mensaje de error.
  await expect(page.getByText('Email already in use')).toBeVisible();
});