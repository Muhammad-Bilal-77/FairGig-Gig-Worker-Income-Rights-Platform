import json
from pathlib import Path

import httpx

BASE_EARNINGS = 'http://localhost:4002'
BASE_AUTH = 'http://localhost:4001'


def main() -> None:
    out: dict = {'errors': []}

    with httpx.Client(timeout=20.0) as client:
        try:
            health = client.get(f'{BASE_EARNINGS}/health')
            out['health_status_code'] = health.status_code
            out['health_body'] = health.json()
        except Exception as exc:
            out['errors'].append(f'health_failed: {exc}')
            print(json.dumps(out, indent=2, default=str))
            return

        try:
            worker_login = client.post(
                f'{BASE_AUTH}/api/auth/login',
                json={'email': 'careem.dha.1@seed.com', 'password': 'password123'},
            )
            worker_login.raise_for_status()
            worker_token = worker_login.json()['access_token']
        except Exception as exc:
            out['errors'].append(f'worker_login_failed: {exc}')
            print(json.dumps(out, indent=2, default=str))
            return

        headers = {'Authorization': f'Bearer {worker_token}'}

        create_payload = {
            'platform': 'Careem',
            'city_zone': 'DHA',
            'worker_category': 'ride_hailing',
            'shift_date': '2026-04-01',
            'hours_worked': '8.00',
            'gross_earned': '9600.00',
            'platform_deduction': '2880.00',
            'net_received': '6720.00',
            'screenshot_url': 'https://example.com/shift-proof.png',
        }

        create_resp = client.post(
            f'{BASE_EARNINGS}/api/earnings/shifts',
            headers=headers,
            json=create_payload,
        )
        out['create_status_code'] = create_resp.status_code
        out['create_body'] = create_resp.json() if create_resp.content else None
        shift_id = None
        try:
            shift_id = out['create_body']['data']['id']
        except Exception:
            out['errors'].append('create_shift_missing_id')

        bad_payload = {
            'platform': 'Careem',
            'city_zone': 'DHA',
            'worker_category': 'ride_hailing',
            'shift_date': '2026-04-01',
            'hours_worked': '8.00',
            'gross_earned': '9600.00',
            'platform_deduction': '2880.00',
            'net_received': '1111.00',
        }
        bad_resp = client.post(
            f'{BASE_EARNINGS}/api/earnings/shifts',
            headers=headers,
            json=bad_payload,
        )
        out['net_mismatch_status_code'] = bad_resp.status_code
        try:
            out['net_mismatch_body'] = bad_resp.json()
        except Exception:
            out['net_mismatch_body'] = bad_resp.text

        list_resp = client.get(f'{BASE_EARNINGS}/api/earnings/shifts', headers=headers)
        out['list_status_code'] = list_resp.status_code
        list_body = list_resp.json() if list_resp.content else {}
        out['list_count'] = len(list_body.get('data', []))
        worker_ids = {item.get('worker_id') for item in list_body.get('data', [])}
        out['list_unique_worker_ids'] = sorted([wid for wid in worker_ids if wid])

        median_resp = client.get(
            f'{BASE_EARNINGS}/api/earnings/median',
            headers=headers,
            params={
                'city_zone': 'DHA',
                'platform': 'Careem',
                'worker_category': 'ride_hailing',
            },
        )
        out['median_status_code'] = median_resp.status_code
        out['median_body'] = median_resp.json() if median_resp.content else None

        csv_path = Path(__file__).parent / 'tmp_test.csv'
        csv_path.write_text(
            'platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received\n'
            'Careem,DHA,ride_hailing,2026-03-15,6.00,7200.00,2160.00,5040.00\n'
            'Bykea,DHA,ride_hailing,2026-03-16,5.00,4500.00,1125.00,3375.00\n',
            encoding='utf-8',
        )
        with csv_path.open('rb') as fp:
            csv_resp = client.post(
                f'{BASE_EARNINGS}/api/earnings/shifts/import',
                headers=headers,
                files={'file': ('tmp_test.csv', fp, 'text/csv')},
            )
        out['csv_status_code'] = csv_resp.status_code
        out['csv_body'] = csv_resp.json() if csv_resp.content else None

        try:
            verifier_login = client.post(
                f'{BASE_AUTH}/api/auth/login',
                json={'email': 'verifier1@fairgig.com', 'password': 'password123'},
            )
            verifier_login.raise_for_status()
            verifier_token = verifier_login.json()['access_token']
        except Exception as exc:
            out['errors'].append(f'verifier_login_failed: {exc}')
            print(json.dumps(out, indent=2, default=str))
            return

        v_headers = {'Authorization': f'Bearer {verifier_token}'}

        pending_resp = client.get(
            f'{BASE_EARNINGS}/api/earnings/shifts/pending-verification',
            headers=v_headers,
        )
        out['pending_status_code'] = pending_resp.status_code
        out['pending_body'] = pending_resp.json() if pending_resp.content else None

        if shift_id is not None:
            verify_resp = client.patch(
                f'{BASE_EARNINGS}/api/earnings/shifts/{shift_id}/verify',
                headers=v_headers,
                json={'status': 'CONFIRMED', 'note': 'Verified in prompt3 automation run'},
            )
            out['verify_status_code'] = verify_resp.status_code
            out['verify_body'] = verify_resp.json() if verify_resp.content else None

        checks = {
            'health_200': out.get('health_status_code') == 200,
            'create_201': out.get('create_status_code') == 201,
            'net_mismatch_400': out.get('net_mismatch_status_code') == 400,
            'list_single_worker_scope': len(out.get('list_unique_worker_ids', [])) == 1,
            'median_has_worker_count_gte_5': bool(
                out.get('median_body', {}).get('data')
                and out['median_body']['data'][0].get('worker_count', 0) >= 5
            ),
            'median_has_percentile': bool(
                out.get('median_body', {}).get('data')
                and out['median_body']['data'][0].get('percentile_vs_median') is not None
            ),
            'csv_has_imported_skipped_errors': all(
                key in (out.get('csv_body', {}).get('data', {}))
                for key in ('imported', 'skipped', 'errors')
            ),
            'verifier_pending_200': out.get('pending_status_code') == 200,
            'verifier_patch_verify_200': out.get('verify_status_code') == 200,
        }
        out['checks'] = checks

    print(json.dumps(out, indent=2, default=str))


if __name__ == '__main__':
    main()
